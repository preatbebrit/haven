import { MOCK_PEOPLE_DIRECTORY, type MockPerson } from '@/constants/mock-friends';
import {
  MOCK_FRIEND_GALLERIES,
  MOCK_FRIEND_PROMPTS,
  type FriendGallery,
  type FriendPromptEntry,
} from '@/constants/mock-friend-content';
import { MOCK_GROUP_CARDS } from '@/constants/mock-groups';

/** Look up a mock person by handle (case-insensitive). Returns null if not found. */
export function getProfileByUsername(username: string): MockPerson | null {
  if (!username) return null;
  const key = username.toLowerCase();
  return MOCK_PEOPLE_DIRECTORY.find((p) => p.handle.toLowerCase() === key) ?? null;
}

/** Look up by canonical id (same as handle for v1). */
export function getProfileById(id: string): MockPerson | null {
  return getProfileByUsername(id);
}

/** Mock gallery photos for a friend. Returns [] if the handle has no seeded gallery. */
export function getGalleryFor(handle: string): FriendGallery {
  if (!handle) return [];
  return MOCK_FRIEND_GALLERIES[handle.toLowerCase()] ?? [];
}

/** Mock past prompt answers for a friend. Returns [] if the handle has none. */
export function getPromptsFor(handle: string): FriendPromptEntry[] {
  if (!handle) return [];
  return MOCK_FRIEND_PROMPTS[handle.toLowerCase()] ?? [];
}

function hashHandle(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Profile stats for the Chats / Friends cards on someone's profile.
 *
 * Chat count is sourced from `GroupMember.chatsJoined` when the handle is in
 * any seeded group (so it stays consistent with the group cards). Friend count
 * is derived deterministically from the handle hash so each profile shows a
 * stable number across reloads.
 */
export function getProfileStats(handle: string): { chats: number; friends: number } {
  const key = handle.toLowerCase();
  let chats = -1;
  for (const g of MOCK_GROUP_CARDS) {
    for (const m of g.members) {
      if (m.handle.toLowerCase() === key) {
        chats = m.chatsJoined;
        break;
      }
    }
    if (chats >= 0) break;
  }
  if (chats < 0) chats = (hashHandle(key) % 30) + 1;
  const friends = (hashHandle(key) % 200) + 1;
  return { chats, friends };
}
