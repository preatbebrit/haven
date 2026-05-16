/**
 * Static mock content for friend profiles — galleries and past prompt answers.
 * Keyed by lowercased handle. Used by `lib/profile-directory.ts` lookups so
 * `app/user/[username].tsx` renders populated states for the dev-seeded
 * friends in `DEV_SEED_FRIENDS`.
 *
 * Photos use picsum.photos with stable per-friend seeds so the same friend
 * always gets the same images across reloads. Gallery lengths vary (3–6) so
 * partial-fill states are visible without manual tweaking.
 */

export type FriendGallery = string[];

function gallery(handle: string, count: number): FriendGallery {
  return Array.from(
    { length: count },
    (_, i) => `https://picsum.photos/seed/${handle}-${i + 1}/600/600`,
  );
}

export const MOCK_FRIEND_GALLERIES: Record<string, FriendGallery> = {
  grover: gallery('grover', 5),
  staceygirl: gallery('staceygirl', 4),
  'cindry chan': gallery('cindrychan', 6),
  janey: gallery('janey', 3),
  river_codes: gallery('rivercodes', 5),
};

export type FriendPromptEntry = {
  question: string;
  answer: string;
};

export const MOCK_FRIEND_PROMPTS: Record<string, FriendPromptEntry[]> = {
  grover: [
    {
      question: 'What are you unlearning right now?',
      answer: 'That softness is something to apologize for. Turns out it’s the whole point.',
    },
    {
      question: 'Who is your favorite queer artist?',
      answer: 'Felix Gonzalez-Torres. The candy piles wreck me every time.',
    },
    {
      question: 'When do you feel most like yourself?',
      answer: 'Friday nights at the museum, taking notes nobody asked for.',
    },
  ],
  staceygirl: [
    {
      question: 'When do you feel most like yourself?',
      answer: 'Driving home through the cornfields with the windows down.',
    },
    {
      question: 'Where do you feel most comfortable being yourself?',
      answer: 'My apartment, with the same three friends, eating the same noodles.',
    },
    {
      question: 'What are you unlearning right now?',
      answer: 'That I have to translate myself for everyone. Sometimes they can just learn.',
    },
  ],
  'cindry chan': [
    {
      question: 'Who is your favorite queer artist?',
      answer: 'Tseng Kwong Chi. Tourist persona, deeply queer eye, criminally underrated.',
    },
    {
      question: 'When do you feel most like yourself?',
      answer: 'Mid-sketch at 2am, two cups deep, ignoring my inbox.',
    },
    {
      question: 'What are you unlearning right now?',
      answer: 'That replying late means I don’t care. I do — I’m just a slow loris.',
    },
  ],
  janey: [
    {
      question: 'Where do you feel most comfortable being yourself?',
      answer: 'Anywhere there are snacks and at least one dog.',
    },
    {
      question: 'When do you feel most like yourself?',
      answer: 'Packing the picnic. The picnic is the love language.',
    },
    {
      question: 'What are you unlearning right now?',
      answer: 'That being the chill one means I don’t get to have needs.',
    },
  ],
  river_codes: [
    {
      question: 'When do you feel most like yourself?',
      answer: 'Voice rehearsals in the car. Every red light is a rep.',
    },
    {
      question: 'What are you unlearning right now?',
      answer: 'That my old voice was the “real” one. They’re both me — one is just newer.',
    },
    {
      question: 'Who is your favorite queer artist?',
      answer: 'SOPHIE. Still not over it. Probably never will be.',
    },
  ],
};
