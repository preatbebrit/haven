import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@haven/active_chat_v1';

export const CHAT_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type ActiveChat = {
  chatId: string;
  joinedAt: number;
};

export async function getActiveChat(): Promise<ActiveChat | null> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (!v) return null;
    const parsed = JSON.parse(v) as ActiveChat;
    if (typeof parsed?.chatId !== 'string' || typeof parsed?.joinedAt !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setActiveChat(chatId: string): Promise<number> {
  const joinedAt = Date.now();
  try {
    const value: ActiveChat = { chatId, joinedAt };
    await AsyncStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
  return joinedAt;
}

export async function clearActiveChat(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function msLeft(joinedAt: number): number {
  return Math.max(0, joinedAt + CHAT_DURATION_MS - Date.now());
}

export function isExpired(joinedAt: number): boolean {
  return msLeft(joinedAt) <= 0;
}

export function formatMsLeft(ms: number): string {
  if (ms <= 0) return 'ended';
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return `${days}d left`;
}
