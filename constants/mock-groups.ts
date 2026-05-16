import type { GenderSymbol } from '@/components/ui/gender-avatar';
import { getPromptColorsForId, type PromptColors } from './theme';

export type GroupMember = {
  id: string;
  handle: string;
  pronouns: string;
  avatarColor: string;
  avatarSymbol: GenderSymbol;
  chatsJoined: number;
};

export type GroupCardData = {
  id: string;
  promptColors: PromptColors; // bg / fg / support — derived deterministically from id
  question: string;
  activeLabel: string;
  openSeats: number;
  members: GroupMember[];
  kind?: 'coming-out'; // pinned at top, forced magenta/black/black colors
};

import { Colors } from './theme';

// Rotating set of coming-out themed prompts. Cards with `kind: 'coming-out'`
// pull a question from here, indexed deterministically by card id so it stays
// stable across remounts.
export const COMING_OUT_QUESTIONS = [
  'What’s been the hardest part of coming out?',
  'Who was the first person you came out to?',
  'What helped you most when you were coming out?',
  'Is there anyone you’re still not out to?',
  'What do you wish people understood about coming out?',
] as const;

function pickComingOutQuestion(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return COMING_OUT_QUESTIONS[Math.abs(hash) % COMING_OUT_QUESTIONS.length];
}

// Coming-out cards always render with this fixed combo, regardless of the
// promptColors stored on the data — call this anywhere a card's effective
// colors are needed (group card, prompt screen, answers screen, etc).
export const COMING_OUT_PROMPT_COLORS: PromptColors = {
  bg: '#C000FF', // Colors.lightPurple
  fg: '#000000', // Colors.black
  support: '#000000',
};

export function getEffectivePromptColors(group: Pick<GroupCardData, 'kind' | 'promptColors'>): PromptColors {
  return group.kind === 'coming-out' ? COMING_OUT_PROMPT_COLORS : group.promptColors;
}

export const MOCK_GROUP_CARDS: GroupCardData[] = [
  {
    id: 'co-1',
    kind: 'coming-out',
    promptColors: getPromptColorsForId('co-1'), // overridden in GroupCard for coming-out kind
    question: pickComingOutQuestion('co-1'),
    activeLabel: 'Active 1d ago',
    openSeats: 1,
    members: [
      { id: 'co1-m1', handle: 'appleseed',     pronouns: 'She/xe',   avatarColor: Colors.lightPurple, avatarSymbol: 'gender-fluid', chatsJoined: 21 },
      { id: 'co1-m2', handle: 'funngy',        pronouns: 'He/her',   avatarColor: Colors.blue,        avatarSymbol: 'cis-man',      chatsJoined: 45 },
      { id: 'co1-m3', handle: 'jessyl',        pronouns: 'She/her',  avatarColor: Colors.lightPurple, avatarSymbol: 'cis-woman',    chatsJoined: 48 },
      { id: 'co1-m4', handle: 'loversfromany', pronouns: 'Whatever', avatarColor: Colors.teal,        avatarSymbol: 'nonbinary',    chatsJoined: 1  },
    ],
  },
  {
    id: 'co-2',
    kind: 'coming-out',
    promptColors: getPromptColorsForId('co-2'),
    question: pickComingOutQuestion('co-2'),
    activeLabel: 'Active 3h ago',
    openSeats: 2,
    members: [
      { id: 'co2-m1', handle: 'rainsoft',  pronouns: 'They/them', avatarColor: Colors.cherry,  avatarSymbol: 'nonbinary',   chatsJoined: 8  },
      { id: 'co2-m2', handle: 'minty_b',   pronouns: 'She/they',  avatarColor: Colors.green,   avatarSymbol: 'demigender',  chatsJoined: 14 },
      { id: 'co2-m3', handle: 'oakleaf',   pronouns: 'He/him',    avatarColor: Colors.purple,  avatarSymbol: 'cis-man',     chatsJoined: 3  },
    ],
  },
  {
    id: '1',
    promptColors: getPromptColorsForId('1'),
    question: 'When do you feel most like yourself?',
    activeLabel: 'Active 1d ago',
    openSeats: 2,
    members: [
      { id: 'm1', handle: 'grover',     pronouns: 'She/her',   avatarColor: Colors.cherry,      avatarSymbol: 'cis-woman',    chatsJoined: 4 },
      { id: 'm2', handle: 'Staceygirl', pronouns: 'They/them', avatarColor: Colors.skyBlue,     avatarSymbol: 'nonbinary',    chatsJoined: 4 },
      { id: 'm3', handle: 'xXrXx',      pronouns: 'She/they',  avatarColor: Colors.lightPurple, avatarSymbol: 'gender-fluid', chatsJoined: 4 },
    ],
  },
  {
    id: '2',
    promptColors: getPromptColorsForId('2'),
    question: 'Who is your favorite queer artist?',
    activeLabel: 'Active 1d ago',
    openSeats: 1,
    members: [
      { id: 'm4', handle: 'Cindry Chan', pronouns: 'She/her',   avatarColor: Colors.teal,    avatarSymbol: 'cis-woman',  chatsJoined: 1  },
      { id: 'm5', handle: 'janey',       pronouns: 'They/them', avatarColor: Colors.magenta, avatarSymbol: 'nonbinary',  chatsJoined: 20 },
      { id: 'm6', handle: 'Rain',        pronouns: 'He/him',    avatarColor: Colors.cherry,  avatarSymbol: 'cis-man',    chatsJoined: 12 },
      { id: 'm7', handle: 'amadabeans',  pronouns: 'She/her',   avatarColor: Colors.cherry,  avatarSymbol: 'pangender',  chatsJoined: 2  },
    ],
  },
  {
    id: '3',
    promptColors: getPromptColorsForId('3'),
    question: 'Where do you feel most comfortable being yourself?',
    activeLabel: 'Active 1d ago',
    openSeats: 3,
    members: [
      { id: 'm8', handle: 'river_codes', pronouns: 'He/him',  avatarColor: Colors.green,       avatarSymbol: 'cis-man',   chatsJoined: 12 },
      { id: 'm9', handle: 'xXrkXx',      pronouns: 'Any/all', avatarColor: Colors.lightPurple, avatarSymbol: 'pangender', chatsJoined: 7  },
    ],
  },
];
