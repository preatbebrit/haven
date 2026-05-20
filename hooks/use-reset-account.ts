import { useCallback } from 'react';

import { useActiveChat } from '@/contexts/active-chat-context';
import { useCurrentUser } from '@/contexts/current-user-context';
import { useFriends } from '@/contexts/friends-context';
import { useNotificationsContext } from '@/contexts/notifications-context';
import { wipeAllLocalData } from '@/lib/local-data-reset';

// DEV / utility hook: wipe persisted data and reload in-memory context state.
// Production "delete account" lives in useDeleteAccount — do not use this
// hook for that, it does not call signOut or the server-side delete.
//
// Contract: this is local-only. It does NOT invalidate the Supabase session.
// Callers that want the session gone must call supabase.auth.signOut()
// themselves. Forgetting to do so leaves a live JWT in SecureStore and a
// stale userId in AuthProvider, which keeps userId-keyed contexts
// (LockProvider in particular) holding pre-wipe state until the next
// session change.
//
// Without the in-memory reload below, the next render would still see the
// previous user's friends, active chat, etc., because most providers
// hydrate from AsyncStorage only on mount.
export function useResetAccount(): () => Promise<void> {
  const { refresh: refreshCurrentUser } = useCurrentUser();
  const { reloadAll: reloadFriends } = useFriends();
  const { leaveChat } = useActiveChat();
  const { clearSeen } = useNotificationsContext();

  return useCallback(async () => {
    await wipeAllLocalData();
    await Promise.all([
      refreshCurrentUser(),
      reloadFriends(),
      leaveChat(),
      clearSeen(),
    ]);
  }, [refreshCurrentUser, reloadFriends, leaveChat, clearSeen]);
}
