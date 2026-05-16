import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getAvatarColors, type GenderSymbol } from '@/components/ui/gender-avatar';
import { GENDER_OPTIONS } from '@/constants/onboarding-options';
import type { ChatUser } from '@/constants/mock-chat';
import { EMPTY_PROFILE, getProfile, type StoredProfile } from '@/lib/profile-storage';

// Onboarding's GENDER_OPTIONS ids → GenderSymbol slugs used by the avatar.
// Onboarding ids without an exact symbol (bigender, genderqueer, trans-*) are
// mapped to the closest visual analog.
const GENDER_ID_TO_SYMBOL: Record<string, GenderSymbol> = {
  agender: 'agender',
  androgynous: 'androgynous',
  bigender: 'third-gender',
  'cis-man': 'cis-man',
  'cis-woman': 'cis-woman',
  demigender: 'demigender',
  genderfluid: 'gender-fluid',
  genderqueer: 'nonbinary',
  intersex: 'intersex',
  nonbinary: 'nonbinary',
  'trans-man': 'transgender',
  'trans-woman': 'transgender',
  'two-spirit': 'two-spirit',
  questioning: 'gender-questioning',
  other: 'pangender',
};

const FALLBACK_HANDLE = 'Jane_o_0';
const FALLBACK_PRONOUNS = 'They/them';
const FALLBACK_SYMBOL: GenderSymbol = 'pangender';
const FALLBACK_TAGS = ['Pangender', 'Out', 'AAPI', 'Neurodivergent'];

export type CurrentUserDisplayProfile = {
  handle: string;
  pronouns: string;
  avatarSymbol: GenderSymbol;
  tags: string[];
};

type CurrentUserContextValue = {
  me: ChatUser;
  displayProfile: CurrentUserDisplayProfile;
  /** Re-read AsyncStorage and update state. Call after writing to profile-storage. */
  refresh: () => Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

function buildFromStored(stored: StoredProfile): {
  me: ChatUser;
  displayProfile: CurrentUserDisplayProfile;
} {
  const handle = stored.username.trim() || FALLBACK_HANDLE;
  const pronouns =
    stored.pronounsCustom.trim() || stored.pronounPreset || FALLBACK_PRONOUNS;
  const avatarSymbol: GenderSymbol = stored.genderId
    ? GENDER_ID_TO_SYMBOL[stored.genderId] ?? FALLBACK_SYMBOL
    : FALLBACK_SYMBOL;
  const avatarColor = getAvatarColors(handle).bg;

  const genderTitle = stored.genderId
    ? GENDER_OPTIONS.find((g) => g.id === stored.genderId)?.title
    : undefined;
  const tags: string[] = [];
  if (genderTitle) tags.push(genderTitle);
  if (stored.outStatus === 'yes') tags.push('Out');
  else if (stored.outStatus === 'no') tags.push('Not out');
  tags.push(...stored.identities);
  // Pre-onboarding placeholder so the profile page has something to render.
  const effectiveTags = stored.username.trim() ? tags : [...FALLBACK_TAGS];

  return {
    me: {
      id: 'me',
      handle,
      displayName: handle,
      avatarColor,
      avatarSymbol,
      pronouns,
    },
    displayProfile: {
      handle,
      pronouns,
      avatarSymbol,
      tags: effectiveTags,
    },
  };
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => buildFromStored(EMPTY_PROFILE));
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const stored = await getProfile();
    if (!mountedRef.current) return;
    setState(buildFromStored(stored));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    const onAppStateChange = (status: AppStateStatus) => {
      if (status === 'active') void refresh();
    };
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => {
      mountedRef.current = false;
      sub.remove();
    };
  }, [refresh]);

  const value = useMemo<CurrentUserContextValue>(
    () => ({ me: state.me, displayProfile: state.displayProfile, refresh }),
    [state, refresh],
  );

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error('useCurrentUser must be used within CurrentUserProvider');
  }
  return ctx;
}
