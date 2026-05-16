import type { GenderSymbol } from '@/components/ui/gender-avatar';

import { MOCK_CHAT_MEMBERS, type ChatUser, type MockChatMessage } from './mock-chat';
import { MOCK_GROUP_CARDS, type GroupMember } from './mock-groups';

/**
 * Per-chat content keyed by `GroupCardData.id`. This is the data layer the
 * `/chat` and `/answers` screens read from when the user joins a chat — it
 * replaces the legacy globals (`MOCK_CHAT_THREAD`, `WELCOME_DRIP_MESSAGES`,
 * `SIM_*`) so each card has its own thread, simulated leaver, and answers.
 *
 * Shape mirrors what a future `GET /chats/:id` backend endpoint would return.
 */

export type ChatContent = {
  /** Messages that drip in after the user joins. Authored by card members. */
  welcomeDrip: MockChatMessage[];
  /**
   * Handle of the card member whose `system-leave` event fires
   * `SIM_LEAVE_DELAY_MS` after join. Must match one of `card.members.handle`.
   */
  simLeaveHandle: string;
  /**
   * Handle of the late-joiner whose `system-join` event fires
   * `SIM_JOIN_DELAY_MS` after join. Must NOT be in `card.members` initially.
   * Their ChatUser profile is resolved via `getChatUserByHandle`.
   */
  simJoinHandle: string;
  /** Map of member-handle → prompt-answer text shown on /answers. */
  answersByHandle: Record<string, string>;
};

const co1: ChatContent = {
  welcomeDrip: [
    { id: 'co1-d1', authorId: 'appleseed',     body: "okay so the thing I wish people got: it's not a one-time speech. I come out like, every other week" },
    { id: 'co1-d2', authorId: 'funngy',        body: "YES. people act like there's a finish line and there's just… not" },
    { id: 'co1-d3', authorId: 'jessyl',        body: "I wish ppl knew that being asked 'are you sure?' is exhausting in a way that's hard to describe" },
    { id: 'co1-d4', authorId: 'loversfromany', body: "+1. and we don't owe anyone the full story to be valid" },
    { id: 'co1-d5', authorId: 'appleseed',     body: "also: some of us are out to certain ppl and not to others and that's allowed??" },
    { id: 'co1-d6', authorId: 'funngy',        body: "it's not a binary. nothing about us is lol" },
    { id: 'co1-d7', authorId: 'jessyl',        body: "amen 😭 you're all making me feel so seen rn" },
  ],
  simLeaveHandle: 'loversfromany',
  simJoinHandle: 'sage_glow',
  answersByHandle: {
    appleseed:     "That coming out isn't one speech — it's a hundred tiny ones, every week.",
    funngy:        "We don't owe anyone the full story to be valid.",
    jessyl:        "Being asked 'are you sure' is exhausting in a way I can't fully describe.",
    loversfromany: "Some of us are out to some people. That's allowed. That's enough.",
    sage_glow:     "That softness is something to grow INTO, not out of.",
  },
};

const co2: ChatContent = {
  welcomeDrip: [
    { id: 'co2-d1', authorId: 'rainsoft', body: "the hardest part for me was the silence after I told my mom. she said 'I love you' and then we didn't talk for a week" },
    { id: 'co2-d2', authorId: 'minty_b',  body: "the silence after — nobody warns you about that. it's the loudest part" },
    { id: 'co2-d3', authorId: 'oakleaf',  body: "for me it was telling friends I thought already knew. turned out they didn't, and that hurt different" },
    { id: 'co2-d4', authorId: 'rainsoft', body: "@oakleaf same. the assumed-allies thing stung me too" },
    { id: 'co2-d5', authorId: 'minty_b',  body: "honestly the hardest part is still doing it. it doesn't stop, you just get more practice" },
    { id: 'co2-d6', authorId: 'oakleaf',  body: "yeah no finish line. just more reps. y'all are making this chat softer than I expected 💜" },
  ],
  simLeaveHandle: 'oakleaf',
  simJoinHandle: 'sage_glow',
  answersByHandle: {
    rainsoft:  "The silence after I told my mom. That part nobody warned me about.",
    minty_b:   "Realizing it doesn't stop. Coming out isn't done, it's just practiced.",
    oakleaf:   "Telling friends I thought already knew. They didn't.",
    sage_glow: "Coming out to myself. That one took years.",
  },
};

const chat1: ChatContent = {
  welcomeDrip: [
    { id: '1-d1', authorId: 'grover',     body: "okay this prompt is gonna make me cry. I feel most like me when I'm dancing alone in my kitchen tbh" },
    { id: '1-d2', authorId: 'Staceygirl', body: "small town energy makes that one harder than it should be lol but yes — late nights with my closest ppl, masks off" },
    { id: '1-d3', authorId: 'xXrXx',      body: "probably when I'm laughing too loud and not apologizing for the volume" },
    { id: '1-d4', authorId: 'grover',     body: "@xXrXx the laugh-without-apology era is THE era" },
    { id: '1-d5', authorId: 'Staceygirl', body: "I feel most me when nobody's around to ask the gender question. just exist for a sec" },
    { id: '1-d6', authorId: 'xXrXx',      body: "trying to make those small me-moments louder this year. like a practice" },
  ],
  simLeaveHandle: 'xXrXx',
  simJoinHandle: 'sage_glow',
  answersByHandle: {
    grover:     "Dancing alone in my kitchen. No audience, no shame.",
    Staceygirl: "Late nights with my closest people, masks off.",
    xXrXx:      "When I'm laughing too loud and not apologizing for the volume.",
    sage_glow:  "When I'm singing to my plants. I named them all.",
  },
};

const chat2: ChatContent = {
  welcomeDrip: [
    { id: '2-d1', authorId: 'Cindry Chan', body: "Mitski. she rewired me. that's the answer." },
    { id: '2-d2', authorId: 'janey',       body: "honestly I keep coming back to Sufjan when I wanna feel feelings fully" },
    { id: '2-d3', authorId: 'Rain',        body: "Frank Ocean is just my whole heart. ranked or unranked, doesn't matter" },
    { id: '2-d4', authorId: 'amadabeans',  body: "is it bad if I say SOPHIE 🕯️" },
    { id: '2-d5', authorId: 'Cindry Chan', body: "@amadabeans NEVER bad. SOPHIE is the answer to a different question every week for me" },
    { id: '2-d6', authorId: 'janey',       body: "more underrated picks pls 👀 who's in your weird little corner" },
    { id: '2-d7', authorId: 'Rain',        body: "Arca?? Arca." },
    { id: '2-d8', authorId: 'amadabeans',  body: "ARCA YES okay we're cooking" },
  ],
  simLeaveHandle: 'amadabeans',
  simJoinHandle: 'sage_glow',
  answersByHandle: {
    'Cindry Chan': "Mitski. she rewired me.",
    janey:         "Sufjan when I want to feel my feelings fully.",
    Rain:          "Frank Ocean, unranked, my whole heart.",
    amadabeans:    "SOPHIE. forever and always.",
    sage_glow:     "Anohni. her whole catalog is a hymn.",
  },
};

const chat3: ChatContent = {
  welcomeDrip: [
    { id: '3-d1', authorId: 'river_codes', body: "honestly? my car. windows up, music loud, nobody watching" },
    { id: '3-d2', authorId: 'xXrkXx',      body: "anywhere I'm allowed to be too much, you know?" },
    { id: '3-d3', authorId: 'river_codes', body: "+1. also bookstores. nobody asks bookstore people anything" },
    { id: '3-d4', authorId: 'xXrkXx',      body: "the gym at 6am when only the regulars are there. they nod and move on. it's perfect" },
    { id: '3-d5', authorId: 'river_codes', body: "anywhere with my dog tbh. zero gender opinions from her" },
    { id: '3-d6', authorId: 'xXrkXx',      body: "@river_codes 'zero gender opinions' is going on a shirt" },
  ],
  simLeaveHandle: 'xXrkXx',
  simJoinHandle: 'sage_glow',
  answersByHandle: {
    river_codes: "In the car. Windows up, music loud, no one watching.",
    xXrkXx:      "Anywhere I'm allowed to be too much.",
    sage_glow:   "On the floor with my dog. Low expectations, high comfort.",
  },
};

export const MOCK_CHAT_CONTENT_BY_ID: Record<string, ChatContent> = {
  'co-1': co1,
  'co-2': co2,
  '1': chat1,
  '2': chat2,
  '3': chat3,
};

/**
 * Map a `GroupMember` (the shape used by group cards) to the `ChatUser` shape
 * the chat screens read. `id` is set to the handle so message `authorId` keys
 * (which are handles) resolve cleanly via direct equality.
 */
export function groupMemberToChatUser(m: GroupMember): ChatUser {
  return {
    id: m.handle,
    handle: m.handle,
    displayName: m.handle,
    avatarColor: m.avatarColor,
    avatarSymbol: m.avatarSymbol,
    pronouns: m.pronouns,
  };
}

/**
 * Returns the per-card chat content for the given chat id, or `null` if
 * none is registered. Callers should typically fall back to the first card
 * when `null` (matches the prompt/answers fallback pattern).
 */
export function getChatContentForId(chatId: string | null | undefined): ChatContent | null {
  if (!chatId) return null;
  return MOCK_CHAT_CONTENT_BY_ID[chatId] ?? null;
}

/**
 * Universal handle → ChatUser lookup. Scans every card's members plus the
 * legacy MOCK_CHAT_MEMBERS list (which still holds `sage_glow` and the
 * historical default chat). Used by reply previews, thread sheets, and the
 * chat screen's per-message author resolution where the active card isn't
 * available.
 */
let cachedDirectory: Map<string, ChatUser> | null = null;
function buildDirectory(): Map<string, ChatUser> {
  if (cachedDirectory) return cachedDirectory;
  const map = new Map<string, ChatUser>();
  for (const card of MOCK_GROUP_CARDS) {
    for (const m of card.members) {
      const key = m.handle.toLowerCase();
      if (map.has(key)) continue;
      map.set(key, groupMemberToChatUser(m));
    }
  }
  // MOCK_CHAT_MEMBERS holds the late-joiner (`sage_glow`) plus the legacy
  // default chat roster — include any handles not already covered by cards.
  for (const u of MOCK_CHAT_MEMBERS) {
    const key = u.handle.toLowerCase();
    if (map.has(key)) continue;
    map.set(key, u);
  }
  cachedDirectory = map;
  return map;
}

export function getChatUserByHandle(handle: string, fallbackPool?: ChatUser[]): ChatUser | undefined {
  if (!handle) return undefined;
  const key = handle.toLowerCase();
  const hit = buildDirectory().get(key);
  if (hit) return hit;
  if (fallbackPool) {
    return fallbackPool.find((u) => u.handle.toLowerCase() === key);
  }
  return undefined;
}

/**
 * For consumers that have only an "author id" (could be a handle or 'me' or
 * a chat-user id). Returns undefined if the id is 'me' (caller substitutes
 * the live `me` profile) or unknown.
 */
export function getChatUserById(
  id: string | undefined,
  options?: { me?: ChatUser; pool?: ChatUser[] },
): ChatUser | undefined {
  if (!id) return undefined;
  if (id === 'me') return options?.me;
  // Pool first (lets the active chat's mapped members win over global directory).
  if (options?.pool) {
    const fromPool = options.pool.find((u) => u.id === id || u.handle === id);
    if (fromPool) return fromPool;
  }
  return getChatUserByHandle(id);
}

/** Avatar shape used by `GenderAvatar` lookups for any handle. */
export type ResolvedChatUser = ChatUser & { avatarSymbol: GenderSymbol };
