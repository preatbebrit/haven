import AsyncStorage from '@react-native-async-storage/async-storage';

import type { OutStatus } from '@/contexts/onboarding-context';

const KEY = '@haven/profile_v1';

export type StoredProfile = {
  username: string;
  dateOfBirth: string;
  lockPin: string | null;
  lockSkipped: boolean;
  genderId: string | null;
  pronounPreset: string | null;
  pronounsCustom: string;
  outStatus: OutStatus | null;
  acceptingEnvironment: string | null;
  identities: string[];
};

export const EMPTY_PROFILE: StoredProfile = {
  username: '',
  dateOfBirth: '',
  lockPin: null,
  lockSkipped: false,
  genderId: null,
  pronounPreset: null,
  pronounsCustom: '',
  outStatus: null,
  acceptingEnvironment: null,
  identities: [],
};

function normalize(value: unknown): StoredProfile {
  if (!value || typeof value !== 'object') return { ...EMPTY_PROFILE };
  const v = value as Partial<StoredProfile>;
  return {
    username: typeof v.username === 'string' ? v.username : '',
    dateOfBirth: typeof v.dateOfBirth === 'string' ? v.dateOfBirth : '',
    lockPin: typeof v.lockPin === 'string' ? v.lockPin : null,
    lockSkipped: typeof v.lockSkipped === 'boolean' ? v.lockSkipped : false,
    genderId: typeof v.genderId === 'string' ? v.genderId : null,
    pronounPreset: typeof v.pronounPreset === 'string' ? v.pronounPreset : null,
    pronounsCustom: typeof v.pronounsCustom === 'string' ? v.pronounsCustom : '',
    outStatus:
      v.outStatus === 'yes' || v.outStatus === 'no' || v.outStatus === 'sort-of'
        ? v.outStatus
        : null,
    acceptingEnvironment:
      typeof v.acceptingEnvironment === 'string' ? v.acceptingEnvironment : null,
    identities: Array.isArray(v.identities)
      ? v.identities.filter((x): x is string => typeof x === 'string')
      : [],
  };
}

export async function getProfile(): Promise<StoredProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_PROFILE };
    return normalize(JSON.parse(raw));
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export async function setProfile(partial: Partial<StoredProfile>): Promise<StoredProfile> {
  const current = await getProfile();
  const next: StoredProfile = { ...current, ...partial };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export async function clearProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
