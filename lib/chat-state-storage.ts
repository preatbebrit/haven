import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ChatUser, MockChatMessage } from '@/constants/mock-chat';

const KEY_PREFIX = '@haven/chat_state_v1:';

function keyFor(chatId: string): string {
  return `${KEY_PREFIX}${chatId}`;
}

export type ChatPersistedState = {
  rows: MockChatMessage[];
  likesByMessage: Record<string, string[]>;
  presentMembers: ChatUser[];
  usedDripIds: string[];
  hasUnreadAnswer: boolean;
};

export async function getChatState(chatId: string): Promise<ChatPersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(chatId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.rows) ||
      typeof parsed.likesByMessage !== 'object' ||
      parsed.likesByMessage === null ||
      !Array.isArray(parsed.presentMembers) ||
      !Array.isArray(parsed.usedDripIds)
    ) {
      return null;
    }
    return {
      rows: parsed.rows,
      likesByMessage: parsed.likesByMessage,
      presentMembers: parsed.presentMembers,
      usedDripIds: parsed.usedDripIds,
      hasUnreadAnswer: !!parsed.hasUnreadAnswer,
    };
  } catch {
    return null;
  }
}

export async function setChatState(chatId: string, state: ChatPersistedState): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(chatId), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export async function clearChatState(chatId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(chatId));
  } catch {
    /* ignore */
  }
}

export async function clearAllChatStates(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const chatKeys = keys.filter((k) => k.startsWith(KEY_PREFIX));
    if (chatKeys.length) {
      await AsyncStorage.multiRemove(chatKeys);
    }
  } catch {
    /* ignore */
  }
}
