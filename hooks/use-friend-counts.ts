import { useMemo } from 'react';

import { useFriends } from '@/contexts/friends-context';

export type FriendCounts = {
  friends: number;
  incomingRequests: number;
  outgoingRequests: number;
};

export function useFriendCounts(): FriendCounts {
  const { currentUserId, friendships, incomingRequests, outgoingRequests } = useFriends();
  return useMemo(
    () => ({
      friends: friendships.filter(
        (f) => f.userAId === currentUserId || f.userBId === currentUserId,
      ).length,
      incomingRequests: incomingRequests.length,
      outgoingRequests: outgoingRequests.length,
    }),
    [friendships, incomingRequests, outgoingRequests, currentUserId],
  );
}
