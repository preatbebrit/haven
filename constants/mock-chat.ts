import type { GenderSymbol } from '@/components/ui/gender-avatar';
import type { PromptColors } from '@/constants/theme';

export type ChatUser = {
  id: string;
  handle: string;
  displayName: string;
  avatarColor: string;
  avatarSymbol: GenderSymbol;
  pronouns: string;
};

/**
 * Legacy chat roster + the universal late-joiner (`sage_glow`). Per-chat
 * members now live on each `GroupCardData` and are read via
 * `mock-chat-content.ts` — this list is retained only as:
 *  • the source of `sage_glow` (the simulated joiner all chats share)
 *  • a fallback handle directory for `getChatUserByHandle`
 *  • the historical roster for the friends seed + shared-chat-gate
 */
export const MOCK_CHAT_MEMBERS: ChatUser[] = [
  { id: 'grover',       handle: 'grover',       displayName: 'Grover', avatarColor: '#ff006a', avatarSymbol: 'cis-woman',    pronouns: 'She/her'   },
  { id: 'Staceygirl',  handle: 'Staceygirl',   displayName: 'Stacey', avatarColor: '#00e9ff', avatarSymbol: 'nonbinary',    pronouns: 'They/them' },
  { id: 'xXrkXx',      handle: 'xXrkXx',       displayName: 'RK',     avatarColor: '#c000ff', avatarSymbol: 'pangender',    pronouns: 'Any/all'   },
  { id: 'river_codes', handle: 'river_codes',  displayName: 'River',  avatarColor: '#00ffaa', avatarSymbol: 'cis-man',      pronouns: 'He/him'    },
  { id: 'sage_glow',   handle: 'sage_glow',    displayName: 'Sage',   avatarColor: '#FF00D4', avatarSymbol: 'gender-fluid', pronouns: 'They/them' },
];

/** Delay (ms after joinedAt) for the simulated leave event. */
export const SIM_LEAVE_DELAY_MS = 35_000;
/** Delay (ms after joinedAt) for the simulated join event. */
export const SIM_JOIN_DELAY_MS = 40_000;

/**
 * Trigger counts for the simulated leave/join events. Counted against
 * "real" rows in the chat — drip messages from NPCs plus the user's own
 * messages — and excluding system rows (system-leave, system-join,
 * system-connection). Tied to message count instead of wall-clock time
 * so the events feel like a reaction to actual chatter rather than
 * firing the instant the user opens /chat after lingering elsewhere.
 */
export const SIM_LEAVE_AFTER_MESSAGES = 3;
export const SIM_JOIN_AFTER_MESSAGES = 6;

export type MockChatMessage = {
  id: string;
  authorId: 'me' | string;
  body: string;
  type?: 'system-connection' | 'system-join' | 'system-leave';
  connection?: {
    handle: string;
    pronouns: string;
    avatarColor: string;
    avatarSymbol: GenderSymbol;
    answer: string;
    question: string;
    promptColors: PromptColors;
    /** `true` when shared via Reply — renders without the heart badge. */
    viaReply?: boolean;
  };
  /** Set on `system-join` and `system-leave`. Handle of the user who joined/left. */
  memberHandle?: string;
  /** Set on `system-join` and `system-leave`. Wall-clock timestamp of the event. */
  eventAt?: number;
  gif?: { url: string; title: string };
  replyToId?: string;
};

// Per-chat threads + welcome drips moved to `mock-chat-content.ts`, keyed by
// `GroupCardData.id`. See `MOCK_CHAT_CONTENT_BY_ID`.
