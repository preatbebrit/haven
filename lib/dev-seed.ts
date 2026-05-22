import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CURRENT_CHAT_ID,
  DEV_SEED_FRIENDS,
  DEV_SEED_INCOMING,
  DEV_SEED_OUTGOING,
} from '@/constants/mock-friends';

import { block, clearBlocks } from './blocks-storage';
import { getCurrentUserId } from './current-user';
import { clearReports } from './friend-report-log';
import { clearRequests, type FriendRequest } from './friend-requests-storage';
import { addFriendship, clearFriendships } from './friends-storage';
import { clearSeen as clearNotificationsSeen } from './notifications-storage';
import { clearGallery } from './gallery-storage';
import {
  clearShares,
  share as storageShare,
  unshare as storageUnshare,
} from './profile-shares-storage';
import { clearTopFriends, setSlot } from './top-friends-storage';

/**
 * Dev-only seeders. These bypass validation gates (shared-chat, etc.) so we can
 * exercise UI states without going through the full request flow.
 */

// Subsets of seeded friends who share each content type with me. Friends not
// in a given set are seeded as friends-without-that-share so we can eyeball
// both states (content visible vs. hidden) without manually toggling.
const DEV_SEED_GALLERY_SHARERS = new Set(['grover', 'Staceygirl', 'janey']);
const DEV_SEED_PROMPTS_SHARERS = new Set(['grover', 'Staceygirl', 'janey']);
const DEV_SEED_IDENTITY_SHARERS = new Set(['grover', 'Staceygirl', 'janey']);

export async function seedFriends(): Promise<void> {
  const me = getCurrentUserId();
  for (const handle of DEV_SEED_FRIENDS) {
    await addFriendship(me, handle, CURRENT_CHAT_ID);
    // Reconcile share gates against the per-kind sharer sets. Direction:
    // ownerId = friend, viewerId = me. Idempotent so re-seeding after
    // changing a sharer set actually toggles the state instead of accreting.
    if (DEV_SEED_GALLERY_SHARERS.has(handle)) {
      await storageShare(handle, me, 'gallery');
    } else {
      await storageUnshare(handle, me, 'gallery');
    }
    if (DEV_SEED_PROMPTS_SHARERS.has(handle)) {
      await storageShare(handle, me, 'prompts');
    } else {
      await storageUnshare(handle, me, 'prompts');
    }
    if (DEV_SEED_IDENTITY_SHARERS.has(handle)) {
      await storageShare(handle, me, 'identity');
    } else {
      await storageUnshare(handle, me, 'identity');
    }
  }
}

const REQUESTS_KEY = '@haven/friend_requests_v1';

async function readRawRequests(): Promise<FriendRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeRawRequests(rows: FriendRequest[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

export async function seedPendingRequests(): Promise<void> {
  const me = getCurrentUserId();
  const now = Date.now();
  const existing = await readRawRequests();

  const newRows: FriendRequest[] = [];
  for (const sender of DEV_SEED_INCOMING) {
    const createdAt = now - Math.floor(Math.random() * 60_000);
    newRows.push({
      id: `${sender}__${me}__${createdAt}`,
      senderId: sender,
      recipientId: me,
      status: 'pending',
      createdAt,
      resolvedAt: null,
      sharedChatId: CURRENT_CHAT_ID,
    });
  }
  for (const recipient of DEV_SEED_OUTGOING) {
    const createdAt = now - Math.floor(Math.random() * 60_000);
    newRows.push({
      id: `${me}__${recipient}__${createdAt}`,
      senderId: me,
      recipientId: recipient,
      status: 'pending',
      createdAt,
      resolvedAt: null,
      sharedChatId: CURRENT_CHAT_ID,
    });
  }
  await writeRawRequests([...existing, ...newRows]);
}

export async function seedTopFriends(): Promise<void> {
  const me = getCurrentUserId();
  // Ensure the friendship + share gates exist so each pinned tile is a real
  // friend with shared gallery (otherwise the profile screen would still show
  // "Add friend" and the scatter photos would be empty).
  await seedFriends();
  // Pin the first 4 of the seeded friends to slots 1-4. Leave 5-6 empty.
  for (let i = 0; i < 4 && i < DEV_SEED_FRIENDS.length; i += 1) {
    await setSlot(me, i + 1, DEV_SEED_FRIENDS[i]);
  }
}

export async function seedBlock(target: string): Promise<void> {
  const me = getCurrentUserId();
  await block(me, target);
}

export async function clearAllFriendsData(): Promise<void> {
  await Promise.all([
    clearFriendships(),
    clearRequests(),
    clearTopFriends(),
    clearShares(),
    clearBlocks(),
    clearReports(),
    clearNotificationsSeen(),
  ]);
}

export async function clearEverything(): Promise<void> {
  await clearAllFriendsData();
  await clearGallery();
}
