import { getRandomPromptColors, type PromptColors } from './theme';

export type GroupMember = {
  id: string;
  handle: string;
  pronouns: string;
  avatarColor: string;
  messageCount: number;
};

export type IdentityTag = {
  label: string;
  matched: boolean; // true = cherry border, false = gray80 border
};

export type GroupCardData = {
  id: string;
  promptColors: PromptColors; // bg / fg / support — assigned via getRandomPromptColors()
  question: string;
  activeLabel: string;
  openSeats: number;
  members: GroupMember[];
  tags: IdentityTag[];
};

import { Colors } from './theme';

export const MOCK_GROUP_CARDS: GroupCardData[] = [
  {
    id: '1',
    promptColors: getRandomPromptColors(),
    question: 'When do you feel most like yourself?',
    activeLabel: 'Active 1d ago',
    openSeats: 2,
    members: [
      { id: 'm1', handle: 'grover',     pronouns: 'She/her',   avatarColor: Colors.cherry,      messageCount: 4 },
      { id: 'm2', handle: 'Staceygirl', pronouns: 'They/them', avatarColor: Colors.skyBlue,     messageCount: 4 },
      { id: 'm3', handle: 'xXrXx',      pronouns: 'She/they',  avatarColor: Colors.lightPurple, messageCount: 4 },
    ],
    tags: [
      { label: 'Nonbinary',            matched: true  },
      { label: 'Out',                  matched: true  },
      { label: 'Cis Woman',            matched: false },
      { label: 'Black/African Decent', matched: false },
      { label: 'Not out',              matched: false },
    ],
  },
  {
    id: '2',
    promptColors: getRandomPromptColors(),
    question: 'Who is your favorite queer artist?',
    activeLabel: 'Active 1d ago',
    openSeats: 1,
    members: [
      { id: 'm4', handle: 'Cindry Chan', pronouns: 'She/her',   avatarColor: Colors.teal,    messageCount: 1  },
      { id: 'm5', handle: 'janey',       pronouns: 'They/them', avatarColor: Colors.magenta, messageCount: 20 },
      { id: 'm6', handle: 'Rain',        pronouns: 'He/him',    avatarColor: Colors.cherry,  messageCount: 12 },
      { id: 'm7', handle: 'amadabeans',  pronouns: 'She/her',   avatarColor: Colors.cherry,  messageCount: 2  },
    ],
    tags: [
      { label: 'Nonbinary',            matched: true  },
      { label: 'Out',                  matched: true  },
      { label: 'Pangender',            matched: false },
      { label: 'Nerodivergent',        matched: false },
      { label: 'Black/African Decent', matched: false },
      { label: 'Not out',              matched: false },
    ],
  },
  {
    id: '3',
    promptColors: getRandomPromptColors(),
    question: 'Where do you feel most comfortable being yourself?',
    activeLabel: 'Active 1d ago',
    openSeats: 3,
    members: [
      { id: 'm8', handle: 'Cindry Chan', pronouns: 'She/her',   avatarColor: Colors.teal,    messageCount: 1  },
      { id: 'm9', handle: 'janey',       pronouns: 'They/them', avatarColor: Colors.magenta, messageCount: 20 },
    ],
    tags: [
      { label: 'Nonbinary',  matched: true  },
      { label: 'Out',        matched: true  },
      { label: 'AAPI',       matched: true  },
      { label: 'Demigender', matched: false },
      { label: 'Parent',     matched: false },
    ],
  },
];
