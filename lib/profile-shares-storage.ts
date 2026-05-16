import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@haven/profile_shares_v1';

export type ShareKind = 'gallery' | 'prompts' | 'identity';

export type ShareEntry = {
  ownerId: string;
  viewerId: string;
  kind: ShareKind;
  sharedAt: number;
};

function entryId(e: Pick<ShareEntry, 'ownerId' | 'viewerId' | 'kind'>): string {
  return `${e.ownerId}__${e.viewerId}__${e.kind}`;
}

export async function getShares(): Promise<ShareEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeShares(rows: ShareEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

export async function isShared(ownerId: string, viewerId: string, kind: ShareKind): Promise<boolean> {
  const rows = await getShares();
  const id = entryId({ ownerId, viewerId, kind });
  return rows.some((r) => entryId(r) === id);
}

export async function share(ownerId: string, viewerId: string, kind: ShareKind): Promise<void> {
  const rows = await getShares();
  const id = entryId({ ownerId, viewerId, kind });
  if (rows.some((r) => entryId(r) === id)) return;
  await writeShares([...rows, { ownerId, viewerId, kind, sharedAt: Date.now() }]);
}

export async function unshare(ownerId: string, viewerId: string, kind: ShareKind): Promise<void> {
  const rows = await getShares();
  const id = entryId({ ownerId, viewerId, kind });
  await writeShares(rows.filter((r) => entryId(r) !== id));
}

export async function clearShares(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
