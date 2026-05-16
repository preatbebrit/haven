import { useCallback, useMemo } from 'react';

import { useFriends } from '@/contexts/friends-context';
import { useNotificationsContext } from '@/contexts/notifications-context';

export type NotificationKind =
  | 'fr-recv'     // friend request received
  | 'fr-acc'      // outgoing friend request accepted
  | 'friend-new'  // any newly-created friendship (incoming or self-initiated)
  | 'gallery'     // friend shared their gallery
  | 'prompts'     // friend shared their prompt answers
  | 'identity';   // friend shared their identity tags

export type Notification = {
  id: string;
  kind: NotificationKind;
  fromUserId: string;
  createdAt: number;
};

export type UseNotifications = {
  all: Notification[];
  unread: Notification[];
  unreadCount: number;
  unreadByFriendId: Map<string, Notification[]>;
  friendsWithUnreadCount: number;
  markSeen: (ids: string[]) => void;
  markAllSeen: () => void;
  markVisibleOnProfile: () => void;
};

export function useNotifications(): UseNotifications {
  const {
    currentUserId,
    friendships,
    incomingRequests,
    outgoingAccepted,
    shares,
    topFriends,
  } = useFriends();
  const { seenIds, markSeen } = useNotificationsContext();

  const all = useMemo<Notification[]>(() => {
    const items: Notification[] = [];

    for (const r of incomingRequests) {
      items.push({
        id: `fr-recv:${r.id}`,
        kind: 'fr-recv',
        fromUserId: r.senderId,
        createdAt: r.createdAt,
      });
    }

    for (const r of outgoingAccepted) {
      items.push({
        id: `fr-acc:${r.id}`,
        kind: 'fr-acc',
        fromUserId: r.recipientId,
        createdAt: r.resolvedAt ?? r.createdAt,
      });
    }

    // Friendships count as "new" for 7 days after they're created; after that the
    // notification disappears even if it was never explicitly acknowledged.
    const friendNewCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const f of friendships) {
      if (f.createdAt < friendNewCutoff) continue;
      const otherId =
        f.userAId === currentUserId
          ? f.userBId
          : f.userBId === currentUserId
          ? f.userAId
          : null;
      if (!otherId) continue;
      items.push({
        id: `friend-new:${f.id}`,
        kind: 'friend-new',
        fromUserId: otherId,
        createdAt: f.createdAt,
      });
    }

    for (const s of shares) {
      if (s.viewerId !== currentUserId) continue;
      const kind: NotificationKind =
        s.kind === 'gallery' ? 'gallery' : s.kind === 'prompts' ? 'prompts' : 'identity';
      items.push({
        id: `share:${s.ownerId}:${s.kind}:${s.sharedAt}`,
        kind,
        fromUserId: s.ownerId,
        createdAt: s.sharedAt,
      });
    }

    items.sort((a, b) => b.createdAt - a.createdAt);
    return items;
  }, [friendships, incomingRequests, outgoingAccepted, shares, currentUserId]);

  const unread = useMemo(() => all.filter((n) => !seenIds.has(n.id)), [all, seenIds]);

  const unreadByFriendId = useMemo(() => {
    const map = new Map<string, Notification[]>();
    for (const n of unread) {
      const list = map.get(n.fromUserId);
      if (list) {
        list.push(n);
      } else {
        map.set(n.fromUserId, [n]);
      }
    }
    return map;
  }, [unread]);

  const friendsWithUnreadCount = unreadByFriendId.size;

  const markAllSeen = useCallback(() => {
    if (all.length === 0) return;
    markSeen(all.map((n) => n.id));
  }, [all, markSeen]);

  const markVisibleOnProfile = useCallback(() => {
    // Notifications visible on the profile page = those tied to friends in the
    // top-6 MyFriendsPreview tiles. Friend-request-received notifications come
    // from non-friends and are NOT visible on /profile, so they are not marked.
    const visibleIds = new Set(topFriends.filter((id): id is string => !!id));
    if (visibleIds.size === 0) return;
    const ids: string[] = [];
    for (const n of all) {
      if (n.kind === 'fr-recv') continue;
      if (visibleIds.has(n.fromUserId)) ids.push(n.id);
    }
    if (ids.length > 0) markSeen(ids);
  }, [all, topFriends, markSeen]);

  return {
    all,
    unread,
    unreadCount: unread.length,
    unreadByFriendId,
    friendsWithUnreadCount,
    markSeen,
    markAllSeen,
    markVisibleOnProfile,
  };
}
