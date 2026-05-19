import { useCallback } from 'react';

import { useActiveChat } from '@/contexts/active-chat-context';
import { useCurrentUser } from '@/contexts/current-user-context';
import { useFriends } from '@/contexts/friends-context';
import { useNotificationsContext } from '@/contexts/notifications-context';
import { wipeAllLocalData } from '@/lib/local-data-reset';

// Wipes persisted data and resets every in-memory context to its
// fresh-account state. Without the in-memory reset, the next render
// would still see the previous user's friends, active chat, etc.,
// because providers hydrate from AsyncStorage once on mount.
//
// Lock state isn't reset here: wipeAllLocalData drops the entire @haven/*
// namespace (including per-user lock keys), and LockProvider's session-watch
// effect clears in-memory lock state when the caller signs out.
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
