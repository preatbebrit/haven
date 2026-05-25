import type { GenderSymbol } from '@/components/ui/gender-avatar';

import { MOCK_CHAT_MEMBERS } from './mock-chat';
import { MOCK_GROUP_CARDS } from './mock-groups';

export type MockPerson = {
  /** Canonical user id — equal to `handle` for non-self users; matches the [username] route param. */
  id: string;
  handle: string;
  pronouns: string;
  avatarSymbol: GenderSymbol;
  bio?: string;
  identityTags?: string[];
};

// Identity tag values use the canonical strings from GENDER_OPTIONS.title and
// IDENTITY_OPTIONS so they match the user's onboarded tags exactly. Mismatches
// would silently break the GroupCard's "common identities" highlight logic.
const BIO_BY_HANDLE: Record<string, { bio: string; tags: string[] }> = {
  grover:          { bio: "queer art history nerd, currently unlearning shame.",        tags: ['Cis Woman',  'Out',     'AAPI'] },
  staceygirl:      { bio: "they/them. small town energy, big city dreams.",            tags: ['Nonbinary',  'Out',     'Neurodivergent'] },
  xxrxx:           { bio: "fluid in everything but my coffee order.",                  tags: ['Genderfluid','Out',     'Black/African Descent'] },
  xxrkxx:          { bio: "any/all pronouns. trying to apologize less for my laugh.",  tags: ['Pangender',  'Out',     'Black/African Descent'] },
  river_codes:     { bio: "voice rehearsals in the car, every single time.",           tags: ['Cis Man',    'Out',     'Trans'] },
  mats_nb:         { bio: "the label can wait. the joy can't.",                        tags: ['Genderfluid','Out',     'Latine'] },
  'cindry chan':   { bio: "queer artist, perpetually behind on emails.",               tags: ['Cis Woman',  'AAPI'] },
  janey:           { bio: "softboi energy. i bring snacks.",                           tags: ['Nonbinary',  'Out'] },
  rain:            { bio: "musician, baker, 3rd-shift overthinker.",                   tags: ['Cis Man',    'Out',     'Latine'] },
  amadabeans:      { bio: "panromantic & professionally distracted.",                  tags: ['Pangender',  'Not out'] },
  // ── co-1 / co-2 cohort ──
  appleseed:       { bio: "she/xe. art teacher with the loud laugh.",                  tags: ['Genderfluid','Out',     'Mixed race'] },
  funngy:          { bio: "he/her. coming out is a perpetual project, not a speech.",  tags: ['Cis Man',    'Sort-of out', 'Latine'] },
  jessyl:          { bio: "she/her. tired of being asked if I'm sure.",                tags: ['Cis Woman',  'Out',     'Neurodivergent'] },
  loversfromany:   { bio: "whatever pronouns. allowed-to-be-messy era.",               tags: ['Nonbinary',  'Not out', 'Black/African Descent'] },
  rainsoft:        { bio: "they/them. mom said 'I love you' and then went quiet.",     tags: ['Nonbinary',  'Out',     'Rural'] },
  minty_b:         { bio: "she/they. demigirl on most days.",                          tags: ['Demigender', 'Out',     'AAPI'] },
  oakleaf:         { bio: "he/him. assumed-allies hurt different.",                    tags: ['Cis Man',    'Out',     'Veteran'] },
};

function bioFor(handle: string): { bio?: string; identityTags?: string[] } {
  const key = handle.toLowerCase();
  const hit = BIO_BY_HANDLE[key];
  return hit ? { bio: hit.bio, identityTags: hit.tags } : {};
}

/**
 * Profiles that exist only as friend-graph peers — they're seeded into the
 * dev panel as incoming/outgoing requests but don't appear in any chat or
 * group. Listed explicitly here so the directory build below can include
 * them and `getProfileById` returns full data for the MyFriendsPreview tile.
 */
const EXTRA_PROFILES: { handle: string; pronouns: string; avatarSymbol: GenderSymbol }[] = [
  { handle: 'mats_nb', pronouns: 'They/them', avatarSymbol: 'gender-fluid' },
];

/**
 * Unified directory of mock peers.
 *
 * Built by deduping members across MOCK_GROUP_CARDS, MOCK_CHAT_MEMBERS, and
 * EXTRA_PROFILES by lowercased handle. The first occurrence wins for
 * avatarSymbol/pronouns.
 *
 * `id` is set to `handle` (NOT the synthetic `m1` style) so storage modules
 * and the [username] route both reference the same key.
 */
export const MOCK_PEOPLE_DIRECTORY: MockPerson[] = (() => {
  const seen = new Map<string, MockPerson>();
  for (const group of MOCK_GROUP_CARDS) {
    for (const m of group.members) {
      const key = m.handle.toLowerCase();
      if (seen.has(key)) continue;
      seen.set(key, {
        id: m.handle,
        handle: m.handle,
        pronouns: m.pronouns,
        avatarSymbol: m.avatarSymbol,
        ...bioFor(m.handle),
      });
    }
  }
  for (const c of MOCK_CHAT_MEMBERS) {
    const key = c.handle.toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, {
      id: c.handle,
      handle: c.handle,
      pronouns: c.pronouns ?? '',
      avatarSymbol: c.avatarSymbol,
      ...bioFor(c.handle),
    });
  }
  for (const p of EXTRA_PROFILES) {
    const key = p.handle.toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, {
      id: p.handle,
      handle: p.handle,
      pronouns: p.pronouns,
      avatarSymbol: p.avatarSymbol,
      ...bioFor(p.handle),
    });
  }
  return Array.from(seen.values());
})();

/** Synthetic id for the active chat (MOCK_CHAT_MEMBERS), used by shared-chat-gate. */
export const CURRENT_CHAT_ID = 'current-chat';

/**
 * Dev-seed payloads for the __DEV__ panel. Handles must exist in the directory.
 */
export const DEV_SEED_FRIENDS: string[] = ['grover', 'Staceygirl', 'Cindry Chan', 'janey', 'river_codes'];

export const DEV_SEED_INCOMING: string[] = ['Rain', 'amadabeans', 'mats_nb'];      // these users → me

export const DEV_SEED_OUTGOING: string[] = ['xXrXx', 'xXrkXx'];                    // me → these users
