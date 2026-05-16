import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@haven/notifications_seen_v1';

export async function getSeen(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export async function markSeen(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const current = await getSeen();
    let changed = false;
    for (const id of ids) {
      if (!current.has(id)) {
        current.add(id);
        changed = true;
      }
    }
    if (changed) {
      await AsyncStorage.setItem(KEY, JSON.stringify(Array.from(current)));
    }
  } catch {
    /* ignore */
  }
}

export async function clearSeen(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
