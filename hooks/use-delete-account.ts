import { useCallback, useState } from 'react';

import { useActiveChat } from '@/contexts/active-chat-context';
import { useAuth } from '@/contexts/auth-context';
import { useCurrentUser } from '@/contexts/current-user-context';
import { useFriends } from '@/contexts/friends-context';
import { useNotificationsContext } from '@/contexts/notifications-context';
import { markPendingWipe, wipeAllLocalData } from '@/lib/local-data-reset';
import { supabase } from '@/lib/supabase';

// Real account deletion: server-side delete via the delete-account Edge
// Function, then signOut (scope:'global' to revoke refresh tokens on
// every device), then a local wipe.
//
// Order matters:
//   1. markPendingWipe()   — tombstone for crash recovery (AuthProvider
//                            consumes it on next boot if we crash before
//                            the wipe runs).
//   2. Edge Function call  — single source of truth for server-side
//                            deletion. 200 means the account is gone from
//                            the client's perspective.
//   3. signOut({global})   — invalidates the local session unconditionally
//                            and best-effort revokes refresh tokens.
//   4. wipeAllLocalData()  — removes every @haven/* key and the on-disk
//                            gallery files.
//   5. Defensive context reloads — for providers that don't watch the
//                                  session and re-hydrate only on mount.
//
// Failure handling — see plan §3:
//   network/5xx before server work  → state preserved, return ok:false
//   401 invalid token               → state preserved, return ok:false
//   200 'already-deleted'           → proceed with signOut + wipe (idempotent)
//   200 'deleted-with-warning'      → proceed with signOut + wipe
//                                     (orphan auth.users row may remain;
//                                     not surfaced to the user)

export type DeleteAccountErrorKind = 'network' | 'unauthorized' | 'server';

export type DeleteAccountError = {
  kind: DeleteAccountErrorKind;
  message: string;
};

type State =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'error'; error: DeleteAccountError };

export function useDeleteAccount() {
  const { session } = useAuth();
  const { refresh: refreshCurrentUser } = useCurrentUser();
  const { reloadAll: reloadFriends } = useFriends();
  const { leaveChat } = useActiveChat();
  const { clearSeen } = useNotificationsContext();
  const [state, setState] = useState<State>({ status: 'idle' });

  const deleteAccount = useCallback(async (): Promise<{ ok: boolean }> => {
    const token = session?.access_token;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!token || !supabaseUrl) {
      setState({
        status: 'error',
        error: {
          kind: 'unauthorized',
          message: 'You need to be signed in to delete your account.',
        },
      });
      return { ok: false };
    }

    setState({ status: 'submitting' });
    // Drop the tombstone before any network work so a crash between here
    // and the wipe is recoverable on next launch.
    await markPendingWipe();

    let response: Response;
    try {
      response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch {
      setState({
        status: 'error',
        error: {
          kind: 'network',
          message:
            "Couldn't reach the server. Check your connection and try again.",
        },
      });
      return { ok: false };
    }

    if (response.status === 401) {
      // The function returns 200 with status:'already-deleted' for tokens
      // whose user no longer exists, so a 401 here is a genuinely invalid
      // or expired JWT.
      setState({
        status: 'error',
        error: {
          kind: 'unauthorized',
          message: 'Your session expired. Please sign in again and retry.',
        },
      });
      return { ok: false };
    }

    if (!response.ok) {
      let detail = `Server error (${response.status}).`;
      try {
        const body = (await response.json()) as { error?: string };
        if (body?.error) detail = `Server error: ${body.error}`;
      } catch {
        /* ignore parse failures */
      }
      setState({
        status: 'error',
        error: {
          kind: 'server',
          message: `${detail} Try again in a moment.`,
        },
      });
      return { ok: false };
    }

    // 200: 'deleted' | 'already-deleted' | 'deleted-with-warning'. All
    // three mean the account is gone from the client's perspective.
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch {
      /* non-fatal — supabase clears the local session unconditionally */
    }

    await wipeAllLocalData();

    // Defensive reloads for providers that don't watch session and only
    // re-hydrate on mount (notifications, active-chat). CurrentUser and
    // Friends are also reloaded for symmetry — the session=null cascade
    // doesn't trigger them today.
    await Promise.all([
      refreshCurrentUser(),
      reloadFriends(),
      leaveChat(),
      clearSeen(),
    ]);

    setState({ status: 'idle' });
    return { ok: true };
  }, [session, refreshCurrentUser, reloadFriends, leaveChat, clearSeen]);

  const dismissError = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return { state, deleteAccount, dismissError };
}
