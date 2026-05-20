// Edge Function: delete-account
//
// Real account deletion. Companion to the delete_user_data() RPC and the
// useDeleteAccount client hook.
//
// Trust boundary
// --------------
//   * Client sends POST with Authorization: Bearer <user JWT>. No body.
//   * We verify the JWT with the anon client and read userId from the
//     verified token. NEVER trust a userId in the request body — that
//     would let any signed-in user delete any other user.
//   * Service role is held only inside this function (Edge Function
//     secrets) and is used to (a) run delete_user_data and (b) call
//     auth.admin.deleteUser.
//
// Idempotency
// -----------
//   * 'already-deleted' (200): the JWT is well-formed but the underlying
//     auth.users row is gone. A retried delete after success should not
//     look like a failure. Distinguished from a bad-token 401 by the
//     auth.getUser() error code/status.
//   * 'deleted' (200): freshly deleted on this request.
//   * 'deleted-with-warning' (200): public DB rows are gone but
//     auth.admin.deleteUser failed. From the client's perspective the
//     account is gone; the auth.users row will need manual cleanup.
//
// Non-transactional boundaries
// ----------------------------
//   * The RPC runs inside a single SQL transaction; if any DB step
//     raises, the whole RPC rolls back.
//   * Storage object cleanup is a separate Storage API call (no per-user
//     bucket today — placeholder for when galleries move server-side).
//   * auth.admin.deleteUser is a separate Admin API call — NOT in the DB
//     transaction. If it fails after the RPC succeeds we return
//     'deleted-with-warning' rather than attempting a rollback we can't
//     actually perform.
//
// Audit log
// ---------
// Every step's outcome lands in account_deletion_log. Server-only — never
// returned to the client beyond the request_id, which the client surfaces
// only in error messages for support.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

type StepStatus = 'ok' | 'failed' | 'skipped';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const requestId = crypto.randomUUID();
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (!token) {
    return jsonResponse({ error: 'missing_token', request_id: requestId }, 401);
  }

  // ── Verify the caller's JWT ─────────────────────────────────────────────
  // Two distinct error shapes from auth.getUser():
  //   1. JWT invalid/expired              → 401 unauthenticated
  //   2. JWT valid, auth.users row gone   → 200 already-deleted (idempotent)
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: getUserError } = await authClient.auth.getUser();

  if (getUserError) {
    const code = (getUserError as { code?: string }).code ?? '';
    const status = (getUserError as { status?: number }).status ?? 0;
    // Supabase returns user_not_found / 404 when the JWT is otherwise valid
    // but the referenced auth.users row was deleted. Treat as success.
    if (code === 'user_not_found' || status === 404) {
      return jsonResponse(
        { status: 'already-deleted', request_id: requestId },
        200,
      );
    }
    return jsonResponse(
      { error: 'invalid_token', code, request_id: requestId },
      401,
    );
  }

  const userId = userData.user?.id;
  if (!userId) {
    // Empty user payload but no error: also treat as already-deleted.
    return jsonResponse(
      { status: 'already-deleted', request_id: requestId },
      200,
    );
  }

  // ── Service-role client ─────────────────────────────────────────────────
  // Never exposed beyond this function. Bypasses RLS.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const steps: {
    anonymize: StepStatus | null;
    storage: StepStatus | null;
    profile: StepStatus | null;
    auth_user: StepStatus | null;
  } = { anonymize: null, storage: null, profile: null, auth_user: null };

  let errorMessage: string | null = null;

  // Write the initial audit row up front so we have a record even if every
  // subsequent step throws.
  await admin.from('account_deletion_log').insert({
    request_id: requestId,
    user_id: userId,
  });

  async function finalize() {
    await admin
      .from('account_deletion_log')
      .update({
        completed_at: new Date().toISOString(),
        step_anonymize: steps.anonymize,
        step_storage: steps.storage,
        step_profile: steps.profile,
        step_auth_user: steps.auth_user,
        error_message: errorMessage,
      })
      .eq('request_id', requestId);
  }

  // ── Step 1+2: anonymize + delete profile (single RPC, single tx) ────────
  const { data: rpcData, error: rpcError } = await admin.rpc(
    'delete_user_data',
    { uid: userId },
  );

  if (rpcError) {
    steps.anonymize = 'failed';
    steps.profile = 'failed';
    errorMessage = `rpc: ${rpcError.message}`;
    await finalize();
    return jsonResponse(
      { error: 'server_error', stage: 'rpc', request_id: requestId },
      500,
    );
  }
  steps.anonymize = 'ok';
  steps.profile = 'ok';

  // ── Step 3: storage (outside DB transaction) ────────────────────────────
  // No per-user storage buckets exist today; gallery files live on the
  // device. Marked 'skipped' so a future implementation can flip this
  // branch to 'ok'/'failed' without ambiguity in the audit log.
  steps.storage = 'skipped';

  // ── Step 4: auth.users (outside DB transaction) ─────────────────────────
  // If this fails after the RPC succeeded, we cannot roll back — the user's
  // public data is already gone. Return success-with-warning so the client
  // signs out and wipes local data; the orphaned auth.users row will need
  // manual cleanup (no reaper job in this work — see plan §3).
  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);

  if (deleteUserError) {
    steps.auth_user = 'failed';
    errorMessage = `auth.admin.deleteUser: ${deleteUserError.message}`;
    await finalize();
    return jsonResponse(
      {
        status: 'deleted-with-warning',
        warning: 'auth_user_delete_failed',
        request_id: requestId,
      },
      200,
    );
  }
  steps.auth_user = 'ok';

  await finalize();
  return jsonResponse(
    { status: 'deleted', request_id: requestId, summary: rpcData ?? null },
    200,
  );
});
