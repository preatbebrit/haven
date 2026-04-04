export type GroupMember = {
  id: string;
  handle: string;
  avatarColor: string;
  messageCount: number;
  isNew?: boolean;
};

export type GroupCardData = {
  id: string;
  headerBackground: string;
  questionColor: string;
  question: string;
  activeLabel: string;
  openSeats: number;
  members: GroupMember[];
  tags: string[];
};

export const MOCK_GROUP_CARDS: GroupCardData[] = [
  {
    id: '1',
    headerBackground: '#5b1fb8',
    questionColor: '#39ff14',
    question: 'What is something you are unlearning right now?',
    activeLabel: 'Active 2h',
    openSeats: 2,
    members: [
      { id: 'm1', handle: 'grover', avatarColor: '#ff006a', messageCount: 12 },
      { id: 'm2', handle: 'staceygirl', avatarColor: '#00e9ff', messageCount: 8, isNew: true },
      { id: 'm3', handle: 'xXrkXx', avatarColor: '#c000ff', messageCount: 5 },
    ],
    tags: ['Nonbinary', 'Out', 'Black', 'Parent'],
  },
  {
    id: '2',
    headerBackground: '#0015ff',
    questionColor: '#00e9ff',
    question: 'When do you feel most like yourself?',
    activeLabel: 'Active 1d',
    openSeats: 1,
    members: [
      { id: 'm4', handle: 'Cindry Chan', avatarColor: '#00ffaa', messageCount: 24 },
      { id: 'm5', handle: 'janey', avatarColor: '#ff00d4', messageCount: 15 },
      { id: 'm6', handle: 'Rain', avatarColor: '#ffb800', messageCount: 9 },
    ],
    tags: ['Cis Woman', 'Agender', 'AAPI', 'Neurodivergent'],
  },
  {
    id: '3',
    headerBackground: '#00c4d4',
    questionColor: '#0015ff',
    question: 'Where do you feel most comfortable being yourself?',
    activeLabel: 'Active 3h',
    openSeats: 3,
    members: [
      { id: 'm7', handle: 'sarah_21', avatarColor: '#5500ff', messageCount: 31 },
      { id: 'm8', handle: 'freaady', avatarColor: '#ff006a', messageCount: 6 },
    ],
    tags: ['Not Out', 'Cis Man', 'Demigender', 'Latine'],
  },
];
