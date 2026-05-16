import { CURRENT_CHAT_ID } from '@/constants/mock-friends';
import { MOCK_CHAT_MEMBERS } from '@/constants/mock-chat';
import { MOCK_GROUP_CARDS } from '@/constants/mock-groups';

import { getCurrentUserId } from './current-user';

/**
 * The shared-chat gate: a friend request can only be sent between users who share
 * (or have shared) at least one chat. This runs ONLY at sendRequest time — once
 * a request is pending, the chat ending does not invalidate it.
 *
 * Identity convention: friend storage uses `handle` as user id for mock peers
 * (and `'me'` for the current user). See lib/current-user.ts.
 *
 * Returns the shared chat id if found, or null. Group ids come from MOCK_GROUP_CARDS;
 * the active chat is treated as a single synthetic chat with id CURRENT_CHAT_ID.
 */
export function findSharedChat(userIdA: string, userIdB: string): string | null {
  const me = getCurrentUserId();

  // Group cards: each group lists its members; check both users belong.
  for (const group of MOCK_GROUP_CARDS) {
    const handles = new Set(group.members.map((m) => m.handle.toLowerCase()));
    // Treat 'me' as belonging to every group card the user has joined — for the
    // mock data we assume the current user has joined every visible group.
    const aIn = userIdA === me ? true : handles.has(userIdA.toLowerCase());
    const bIn = userIdB === me ? true : handles.has(userIdB.toLowerCase());
    if (aIn && bIn) return group.id;
  }

  // The active chat (MOCK_CHAT_MEMBERS).
  const chatHandles = new Set(MOCK_CHAT_MEMBERS.map((m) => m.handle.toLowerCase()));
  const aInChat = userIdA === me ? true : chatHandles.has(userIdA.toLowerCase());
  const bInChat = userIdB === me ? true : chatHandles.has(userIdB.toLowerCase());
  if (aInChat && bInChat) return CURRENT_CHAT_ID;

  return null;
}

export function usersShareChat(userIdA: string, userIdB: string): boolean {
  return findSharedChat(userIdA, userIdB) !== null;
}
