import { useCallback } from 'react';

import { useActiveChat } from '@/contexts/active-chat-context';
import { useCurrentUser } from '@/contexts/current-user-context';
import { useFriends } from '@/contexts/friends-context';
import { useLock } from '@/contexts/lock-context';
import { useNotificationsContext } from '@/contexts/notifications-context';
import { wipeAllLocalData } from '@/lib/local-data-reset';

// Wipes persisted data and resets every in-memory context to its
// fresh-account state. Without the in-memory reset, the next render
// would still see the previous user's friends, active chat, etc.,
// because providers hydrate from AsyncStorage once on mount.
export function useResetAccount(): () => Promise<void> {
  const { refresh: refreshCurrentUser } = useCurrentUser();
  const { reloadAll: reloadFriends } = useFriends();
  const { leaveChat } = useActiveChat();
  const { clearSeen } = useNotificationsContext();
  const { refreshPin } = useLock();

  return useCallback(async () => {
    await wipeAllLocalData();
    await Promise.all([
      refreshCurrentUser(),
      reloadFriends(),
      leaveChat(),
      clearSeen(),
      refreshPin(),
    ]);
  }, [refreshCurrentUser, reloadFriends, leaveChat, clearSeen, refreshPin]);
}
