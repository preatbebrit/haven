import AsyncStorage from '@react-native-async-storage/async-storage';

import { addFriendship, isFriend } from './friends-storage';

const KEY = '@haven/friend_requests_v1';

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export type FriendRequest = {
  /** Stable id: `${senderId}__${recipientId}__${createdAt}`. */
  id: string;
  senderId: string;
  recipientId: string;
  status: FriendRequestStatus;
  createdAt: number;
  resolvedAt: number | null;
  sharedChatId: string | null;
};

export type SendRequestResult =
  | { ok: true; request: FriendRequest }
  | { ok: false; reason: 'already-pending' | 'already-friends' | 'no-shared-chat' | 'blocked' | 'self' };

export async function getRequests(): Promise<FriendRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeRequests(rows: FriendRequest[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

function isPending(r: FriendRequest): boolean {
  return r.status === 'pending';
}

export async function getIncomingPending(userId: string): Promise<FriendRequest[]> {
  const rows = await getRequests();
  return rows.filter((r) => r.recipientId === userId && isPending(r));
}

export async function getOutgoingPending(userId: string): Promise<FriendRequest[]> {
  const rows = await getRequests();
  return rows.filter((r) => r.senderId === userId && isPending(r));
}

export async function findPending(senderId: string, recipientId: string): Promise<FriendRequest | null> {
  const rows = await getRequests();
  return rows.find((r) => r.senderId === senderId && r.recipientId === recipientId && isPending(r)) ?? null;
}

export async function sendRequest(
  senderId: string,
  recipientId: string,
  sharedChatId: string | null,
): Promise<SendRequestResult> {
  if (senderId === recipientId) return { ok: false, reason: 'self' };
  if (sharedChatId === null) return { ok: false, reason: 'no-shared-chat' };
  if (await isFriend(senderId, recipientId)) return { ok: false, reason: 'already-friends' };

  const rows = await getRequests();
  const dupe = rows.find(
    (r) => r.senderId === senderId && r.recipientId === recipientId && isPending(r),
  );
  if (dupe) return { ok: false, reason: 'already-pending' };

  const createdAt = Date.now();
  const request: FriendRequest = {
    id: `${senderId}__${recipientId}__${createdAt}`,
    senderId,
    recipientId,
    status: 'pending',
    createdAt,
    resolvedAt: null,
    sharedChatId,
  };
  await writeRequests([...rows, request]);
  return { ok: true, request };
}

async function resolveRequest(
  requestId: string,
  status: Exclude<FriendRequestStatus, 'pending'>,
): Promise<FriendRequest | null> {
  const rows = await getRequests();
  let resolved: FriendRequest | null = null;
  const next = rows.map((r) => {
    if (r.id !== requestId || r.status !== 'pending') return r;
    resolved = { ...r, status, resolvedAt: Date.now() };
    return resolved;
  });
  if (!resolved) return null;
  await writeRequests(next);
  return resolved;
}

export async function acceptRequest(requestId: string): Promise<FriendRequest | null> {
  const resolved = await resolveRequest(requestId, 'accepted');
  if (resolved) {
    await addFriendship(resolved.senderId, resolved.recipientId, resolved.sharedChatId);
  }
  return resolved;
}

export async function declineRequest(requestId: string): Promise<FriendRequest | null> {
  return resolveRequest(requestId, 'declined');
}

export async function cancelRequest(requestId: string): Promise<FriendRequest | null> {
  return resolveRequest(requestId, 'cancelled');
}

/** Cancel any pending requests where `userA` is the sender and `userB` is the recipient. */
export async function cancelPendingFromTo(senderId: string, recipientId: string): Promise<void> {
  const rows = await getRequests();
  const now = Date.now();
  const next = rows.map((r) =>
    r.senderId === senderId && r.recipientId === recipientId && isPending(r)
      ? { ...r, status: 'cancelled' as const, resolvedAt: now }
      : r,
  );
  await writeRequests(next);
}

export async function clearRequests(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
