import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@haven/top_friends_v1';
export const TOP_FRIENDS_SIZE = 6;

export type TopSlot = {
  userId: string;       // owner of the list
  friendId: string;
  position: number;     // 1..TOP_FRIENDS_SIZE
  updatedAt: number;
};

/** Length-TOP_FRIENDS_SIZE array; index i corresponds to position i+1. `null` means empty. */
export type TopFriendsArray = (string | null)[];

function emptyArray(): TopFriendsArray {
  return Array.from({ length: TOP_FRIENDS_SIZE }, () => null);
}

async function getAllSlots(): Promise<TopSlot[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeSlots(slots: TopSlot[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(slots));
  } catch {
    /* ignore */
  }
}

export async function getTopFriends(userId: string): Promise<TopFriendsArray> {
  const slots = await getAllSlots();
  const owned = slots
    .filter((s) => s.userId === userId && s.position >= 1 && s.position <= TOP_FRIENDS_SIZE)
    .sort((a, b) => a.position - b.position);

  // Compact on read: pack non-empty entries into the leading slots so the My
  // Friends grid never has a gap in the middle. Storage rows may still hold
  // their original positions (until the next write), but the rendered view is
  // always contiguous.
  const out = emptyArray();
  owned.slice(0, TOP_FRIENDS_SIZE).forEach((slot, idx) => {
    out[idx] = slot.friendId;
  });
  return out;
}

export async function setSlot(userId: string, position: number, friendId: string | null): Promise<void> {
  if (position < 1 || position > TOP_FRIENDS_SIZE) return;
  const slots = await getAllSlots();
  const filtered = slots.filter((s) => !(s.userId === userId && s.position === position));
  // Also dedupe friendId within the same owner (no double-pinning).
  const deduped = friendId
    ? filtered.filter((s) => !(s.userId === userId && s.friendId === friendId))
    : filtered;
  if (friendId) {
    deduped.push({ userId, friendId, position, updatedAt: Date.now() });
  }
  await writeSlots(deduped);
}

export async function setTopFriends(userId: string, slots: TopFriendsArray): Promise<void> {
  const all = await getAllSlots();
  const others = all.filter((s) => s.userId !== userId);
  const next: TopSlot[] = [...others];
  const seen = new Set<string>();
  for (let i = 0; i < TOP_FRIENDS_SIZE; i += 1) {
    const friendId = slots[i];
    if (!friendId || seen.has(friendId)) continue;
    seen.add(friendId);
    next.push({ userId, friendId, position: i + 1, updatedAt: Date.now() });
  }
  await writeSlots(next);
}

/**
 * Sweeps every owner's list and removes any slot whose friendId matches.
 * After removal, each affected owner's remaining slots are compacted to
 * contiguous positions (1..N) so the My Friends grid never has gaps in the
 * middle — the trailing empty placeholders always sit at the end.
 */
export async function removeFriendFromTopFriends(friendId: string): Promise<void> {
  const slots = await getAllSlots();
  const filtered = slots.filter((s) => s.friendId !== friendId);
  if (filtered.length === slots.length) return;

  const affectedOwners = new Set(
    slots.filter((s) => s.friendId === friendId).map((s) => s.userId),
  );

  const compacted: TopSlot[] = [];
  const byOwner = new Map<string, TopSlot[]>();
  for (const s of filtered) {
    const list = byOwner.get(s.userId);
    if (list) list.push(s);
    else byOwner.set(s.userId, [s]);
  }
  for (const [userId, list] of byOwner) {
    if (affectedOwners.has(userId)) {
      list.sort((a, b) => a.position - b.position);
      list.forEach((slot, idx) => {
        compacted.push({ ...slot, position: idx + 1 });
      });
    } else {
      compacted.push(...list);
    }
  }

  await writeSlots(compacted);
}

export async function clearTopFriends(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
