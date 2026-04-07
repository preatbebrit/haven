export type ChatUser = {
  id: string;
  handle: string;
  displayName: string;
  avatarColor: string;
  pronouns?: string;
};

/** Five people in the small group (+ current user "me" is separate). */
export const MOCK_CHAT_MEMBERS: ChatUser[] = [
  { id: 'grover',      handle: 'grover',      displayName: 'Grover', avatarColor: '#ff006a', pronouns: 'She/her'   },
  { id: 'staceygirl', handle: 'staceygirl',  displayName: 'Stacey', avatarColor: '#00e9ff', pronouns: 'They/them' },
  { id: 'xXrkXx',     handle: 'xXrkXx',      displayName: 'RK',     avatarColor: '#c000ff', pronouns: 'Any/all'   },
  { id: 'river_codes',handle: 'river_codes', displayName: 'River',  avatarColor: '#00ffaa', pronouns: 'He/him'    },
  { id: 'mats_nb',    handle: 'mats_nb',     displayName: 'Mats',   avatarColor: '#ffb800', pronouns: 'They/he'   },
];

export type MockChatMessage = {
  id: string;
  authorId: 'me' | string;
  body: string;
  type?: 'system-connection';
  connection?: { handle: string; avatarColor: string; answer: string };
};

/**
 * Base thread (without the user's prompt answer). The chat screen inserts
 * the shared answer as a "me" message in the right place when present.
 */
export const MOCK_CHAT_THREAD: MockChatMessage[] = [
  {
    id: '1',
    authorId: 'grover',
    body: "okay wait I love that we're actually doing this lol. hi everyone — nervous but glad to be here",
  },
  {
    id: '2',
    authorId: 'staceygirl',
    body: 'hiiiii 💜 same, my hands were sweaty tapping join ngl',
  },
  {
    id: '3',
    authorId: 'xXrkXx',
    body: "the prompt wrecked me in a good way. I'm trying to unlearn apologizing for my laugh?? like it's not that deep brain",
  },
  {
    id: '4',
    authorId: 'river_codes',
    body: "STOP that's so specific I feel called out. I apologize for how I apologize 😭",
  },
  {
    id: '5',
    authorId: 'mats_nb',
    body: "lmaooo. I'm unlearning the idea that I need a neat label ready for strangers. sometimes it's just… messy and that's okay",
  },
  {
    id: '6',
    authorId: 'grover',
    body: 'messy is honest tho. I used to perform this polished queer persona online and I was exhausted by it',
  },
  {
    id: '7',
    authorId: 'staceygirl',
    body: "yeah. small town energy makes you perform even harder. y'all feel that or is it just me",
  },
  {
    id: '8',
    authorId: 'river_codes',
    body: "not just you. I literally practiced my voice in the car before therapy last week. we're doing our best out here",
  },
];
