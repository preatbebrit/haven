import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@haven/blocks_v1';

export type BlockEntry = {
  blockerId: string;
  blockedId: string;
  createdAt: number;
};

export async function getBlocks(): Promise<BlockEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeBlocks(rows: BlockEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

/** True if `a` blocked `b` OR `b` blocked `a`. */
export async function isBlocked(a: string, b: string): Promise<boolean> {
  const rows = await getBlocks();
  return rows.some(
    (r) =>
      (r.blockerId === a && r.blockedId === b) ||
      (r.blockerId === b && r.blockedId === a),
  );
}

export async function block(blockerId: string, blockedId: string): Promise<void> {
  if (blockerId === blockedId) return;
  const rows = await getBlocks();
  if (rows.some((r) => r.blockerId === blockerId && r.blockedId === blockedId)) return;
  await writeBlocks([...rows, { blockerId, blockedId, createdAt: Date.now() }]);
}

export async function unblock(blockerId: string, blockedId: string): Promise<void> {
  const rows = await getBlocks();
  await writeBlocks(rows.filter((r) => !(r.blockerId === blockerId && r.blockedId === blockedId)));
}

export async function clearBlocks(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
