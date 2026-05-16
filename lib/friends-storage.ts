import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@haven/friendships_v1';

export type Friendship = {
  /** Stable id: `${userAId}__${userBId}` with the pair sorted. */
  id: string;
  userAId: string;
  userBId: string;
  createdAt: number;
  sharedChatId: string | null;
};

export function pairId(a: string, b: string): { id: string; userAId: string; userBId: string } {
  const [userAId, userBId] = [a, b].sort();
  return { id: `${userAId}__${userBId}`, userAId, userBId };
}

export async function getFriendships(): Promise<Friendship[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeFriendships(rows: Friendship[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

export async function getFriendIds(userId: string): Promise<string[]> {
  const rows = await getFriendships();
  const out: string[] = [];
  for (const r of rows) {
    if (r.userAId === userId) out.push(r.userBId);
    else if (r.userBId === userId) out.push(r.userAId);
  }
  return out;
}

export async function isFriend(a: string, b: string): Promise<boolean> {
  const { id } = pairId(a, b);
  const rows = await getFriendships();
  return rows.some((r) => r.id === id);
}

export async function addFriendship(
  a: string,
  b: string,
  sharedChatId: string | null,
): Promise<Friendship> {
  const { id, userAId, userBId } = pairId(a, b);
  const rows = await getFriendships();
  const existing = rows.find((r) => r.id === id);
  if (existing) return existing;
  const row: Friendship = { id, userAId, userBId, createdAt: Date.now(), sharedChatId };
  await writeFriendships([...rows, row]);
  return row;
}

export async function removeFriendship(a: string, b: string): Promise<void> {
  const { id } = pairId(a, b);
  const rows = await getFriendships();
  await writeFriendships(rows.filter((r) => r.id !== id));
}

export async function clearFriendships(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
