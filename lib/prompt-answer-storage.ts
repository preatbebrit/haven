import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GenderSymbol } from '@/components/ui/gender-avatar';

const KEY = '@haven/prompt_answers_v1';

export type StoredAnswerCard = {
  groupId: string;
  handle: string;
  pronouns: string;
  avatarColor: string;
  avatarSymbol: GenderSymbol;
  answer: string;
  createdAt: number;
};

export async function getPromptAnswers(): Promise<Record<string, StoredAnswerCard>> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (!v) return {};
    const parsed = JSON.parse(v);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, StoredAnswerCard>;
  } catch {
    return {};
  }
}

export async function getPromptAnswerForGroup(
  groupId: string,
): Promise<StoredAnswerCard | null> {
  const all = await getPromptAnswers();
  return all[groupId] ?? null;
}

export async function setPromptAnswerForGroup(
  groupId: string,
  card: Omit<StoredAnswerCard, 'groupId' | 'createdAt'>,
): Promise<void> {
  try {
    const all = await getPromptAnswers();
    all[groupId] = { ...card, groupId, createdAt: Date.now() };
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export async function clearPromptAnswerForGroup(groupId: string): Promise<void> {
  try {
    const all = await getPromptAnswers();
    if (!(groupId in all)) return;
    delete all[groupId];
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
