import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@haven/answer_likes_v1:';

function keyFor(chatId: string): string {
  return `${KEY_PREFIX}${chatId}`;
}

export async function getAnswerLikes(chatId: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(chatId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export async function addAnswerLike(chatId: string, id: string): Promise<void> {
  const cur = await getAnswerLikes(chatId);
  if (cur.has(id)) return;
  cur.add(id);
  try {
    await AsyncStorage.setItem(keyFor(chatId), JSON.stringify(Array.from(cur)));
  } catch {
    /* ignore */
  }
}

export async function clearAnswerLikes(chatId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(chatId));
  } catch {
    /* ignore */
  }
}

export async function clearAllAnswerLikes(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(KEY_PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    /* ignore */
  }
}
