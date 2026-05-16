import { useMemo } from 'react';

import { useFriends } from '@/contexts/friends-context';
import type { FriendRequest } from '@/lib/friend-requests-storage';
import { pairId } from '@/lib/friends-storage';

export type RelationshipState =
  | 'self'
  | 'blocked'
  | 'friend'
  | 'pending-sent'
  | 'pending-received'
  | 'stranger';

export type Relationship = {
  state: RelationshipState;
  request: FriendRequest | null;
  /** Target shares their gallery with me (controls whether I can see their gallery). */
  sharesGallery: boolean;
  /** Target shares their past prompts with me. */
  sharesPrompts: boolean;
  /** Target shares their identity pills (e.g. Out, Nonbinary, AAPI) with me. */
  sharesIdentity: boolean;
  /** I share my gallery with target (controls what the overflow menu toggles). */
  iShareGallery: boolean;
  /** I share my past prompts with target. */
  iSharePrompts: boolean;
  /** I share my identity pills with target. */
  iShareIdentity: boolean;
};

/**
 * Derive the relationship from `currentUser` to `targetUserId`.
 * Order of resolution: self → blocked → friend → pending-sent → pending-received → stranger.
 */
export function useRelationship(targetUserId: string | null | undefined): Relationship {
  const {
    currentUserId,
    friendships,
    incomingRequests,
    outgoingRequests,
    blocks,
    shares,
  } = useFriends();

  return useMemo<Relationship>(() => {
    const empty = {
      sharesGallery: false,
      sharesPrompts: false,
      sharesIdentity: false,
      iShareGallery: false,
      iSharePrompts: false,
      iShareIdentity: false,
    };

    if (!targetUserId) {
      return { state: 'stranger', request: null, ...empty };
    }

    if (targetUserId === currentUserId) {
      return { state: 'self', request: null, ...empty };
    }

    const blocked = blocks.some(
      (b) =>
        (b.blockerId === currentUserId && b.blockedId === targetUserId) ||
        (b.blockerId === targetUserId && b.blockedId === currentUserId),
    );
    if (blocked) {
      return { state: 'blocked', request: null, ...empty };
    }

    const sharesGallery = shares.some(
      (s) => s.ownerId === targetUserId && s.viewerId === currentUserId && s.kind === 'gallery',
    );
    const sharesPrompts = shares.some(
      (s) => s.ownerId === targetUserId && s.viewerId === currentUserId && s.kind === 'prompts',
    );
    const sharesIdentity = shares.some(
      (s) => s.ownerId === targetUserId && s.viewerId === currentUserId && s.kind === 'identity',
    );
    const iShareGallery = shares.some(
      (s) => s.ownerId === currentUserId && s.viewerId === targetUserId && s.kind === 'gallery',
    );
    const iSharePrompts = shares.some(
      (s) => s.ownerId === currentUserId && s.viewerId === targetUserId && s.kind === 'prompts',
    );
    const iShareIdentity = shares.some(
      (s) => s.ownerId === currentUserId && s.viewerId === targetUserId && s.kind === 'identity',
    );

    const directional = {
      sharesGallery,
      sharesPrompts,
      sharesIdentity,
      iShareGallery,
      iSharePrompts,
      iShareIdentity,
    };

    const { id } = pairId(currentUserId, targetUserId);
    const friendship = friendships.find((f) => f.id === id);
    if (friendship) {
      return { state: 'friend', request: null, ...directional };
    }

    const sent = outgoingRequests.find((r) => r.recipientId === targetUserId);
    if (sent) {
      return { state: 'pending-sent', request: sent, ...directional };
    }

    const received = incomingRequests.find((r) => r.senderId === targetUserId);
    if (received) {
      return { state: 'pending-received', request: received, ...directional };
    }

    return { state: 'stranger', request: null, ...directional };
  }, [
    targetUserId,
    currentUserId,
    friendships,
    incomingRequests,
    outgoingRequests,
    blocks,
    shares,
  ]);
}
