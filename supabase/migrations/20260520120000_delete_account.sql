-- ============================================================================
-- Account deletion: audit log + delete_user_data RPC.
--
-- Companion to the delete-account Edge Function
-- (supabase/functions/delete-account/index.ts) and the useDeleteAccount
-- client hook (hooks/use-delete-account.ts).
--
-- Policy (canonical "Deleted User" tombstone shape — user_id NULL,
-- display_name 'Deleted User', avatar NULL):
--   profiles                            → DELETE
--   messages sent by user (future)      → ANONYMIZE
--   reports filed BY user (future)      → ANONYMIZE (moderation paper trail)
--   reports filed AGAINST user (future) → ANONYMIZE (abuse-pattern / ban-evasion)
--   blocks set by user (future)         → DELETE (personal filter)
--   friendships / requests (future)     → DELETE
--   storage objects (future)            → DELETE (outside this RPC)
--   auth.users                          → DELETE (outside this RPC, called last)
-- ============================================================================

-- Server-only audit log. RLS denies everything to anon/authenticated;
-- only the service role (Edge Function) reads or writes. Rows survive
-- after the referenced user is gone (user_id is nullable, no FK).
create table if not exists public.account_deletion_log (
  id              uuid primary key default gen_random_uuid(),
  request_id      text not null,
  user_id         uuid,
  requested_at    timestamptz not null default now(),
  completed_at    timestamptz,
  -- Per-step outcome: 'ok' | 'failed' | 'skipped' | null (not attempted).
  step_anonymize  text,
  step_storage    text,
  step_profile    text,
  step_auth_user  text,
  error_message   text
);

create index if not exists account_deletion_log_request_id_idx
  on public.account_deletion_log (request_id);

alter table public.account_deletion_log enable row level security;
-- No policies → no row is visible to anon or authenticated. Service role
-- bypasses RLS, which is the only intended caller.

-- ----------------------------------------------------------------------------
-- delete_user_data(uid uuid)
--
-- Anonymizes and deletes everything the user owns in public.* in a single
-- transaction. New tables get plugged in here, not in the Edge Function —
-- this is the single extension point as the schema grows.
--
-- Non-transactional steps (storage objects, auth.admin.deleteUser) live
-- in the Edge Function, not here, and their failure modes are handled
-- separately.
-- ----------------------------------------------------------------------------
create or replace function public.delete_user_data(uid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  anonymized_messages        int := 0;
  anonymized_reports_filed   int := 0;
  anonymized_reports_against int := 0;
  deleted_blocks             int := 0;
  deleted_profile            int := 0;
begin
  -- == Anonymization (placeholders for tables that don't exist yet) =========
  -- Canonical tombstone identity (matches the ANONYMIZED_USER constant on
  -- the client). Future tables that surface user content in the UI should
  -- use this same shape so renderers can avoid null-checks.

  -- Messages — uncomment when chat lands:
  -- update public.messages
  --   set sender_id            = null,
  --       sender_display_name  = 'Deleted User',
  --       sender_avatar_url    = null
  --   where sender_id = uid;
  -- get diagnostics anonymized_messages = row_count;

  -- Reports filed BY this user — uncomment when reports table lands:
  -- update public.reports
  --   set reporter_id           = null,
  --       reporter_display_name = 'Deleted User'
  --   where reporter_id = uid;
  -- get diagnostics anonymized_reports_filed = row_count;

  -- Reports filed AGAINST this user — uncomment when reports table lands:
  -- update public.reports
  --   set reported_id           = null,
  --       reported_display_name = 'Deleted User'
  --   where reported_id = uid;
  -- get diagnostics anonymized_reports_against = row_count;

  -- == Deletion =============================================================
  -- Blocks — uncomment when blocks table lands:
  -- delete from public.blocks where blocker_id = uid;
  -- get diagnostics deleted_blocks = row_count;

  -- Profile row — the only public table that exists today.
  delete from public.profiles where id = uid;
  get diagnostics deleted_profile = row_count;

  return jsonb_build_object(
    'anonymized_messages',        anonymized_messages,
    'anonymized_reports_filed',   anonymized_reports_filed,
    'anonymized_reports_against', anonymized_reports_against,
    'deleted_blocks',             deleted_blocks,
    'deleted_profile',            deleted_profile
  );
end;
$$;

-- Service role only. Authenticated and anon callers get permission denied.
revoke all on function public.delete_user_data(uuid) from public;
revoke all on function public.delete_user_data(uuid) from anon;
revoke all on function public.delete_user_data(uuid) from authenticated;
grant execute on function public.delete_user_data(uuid) to service_role;
