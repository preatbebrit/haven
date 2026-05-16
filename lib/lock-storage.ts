import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_LAST_UNLOCKED_AT = '@haven/lock_last_unlocked_at_v1';
const KEY_WRONG_ATTEMPTS = '@haven/lock_wrong_attempts_v1';
const KEY_LOCKED_UNTIL = '@haven/lock_locked_until_v1';

// Auto-lock window: foregrounding the app after this many ms re-locks it.
export const LOCK_BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000;

// Wrong-PIN cooldown: this many bad attempts triggers a timed lockout.
export const LOCK_MAX_ATTEMPTS = 5;
export const LOCK_TIMEOUT_MS = 30 * 1000;

async function getNumber(key: string): Promise<number | null> {
  try {
    const v = await AsyncStorage.getItem(key);
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function setNumber(key: string, value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}

async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export async function getLastUnlockedAt(): Promise<number | null> {
  return getNumber(KEY_LAST_UNLOCKED_AT);
}

export async function markUnlocked(): Promise<void> {
  await setNumber(KEY_LAST_UNLOCKED_AT, Date.now());
}

export async function clearLastUnlockedAt(): Promise<void> {
  await removeKey(KEY_LAST_UNLOCKED_AT);
}

export async function getWrongAttempts(): Promise<number> {
  const n = await getNumber(KEY_WRONG_ATTEMPTS);
  return n ?? 0;
}

export async function incrementWrongAttempts(): Promise<number> {
  const next = (await getWrongAttempts()) + 1;
  await setNumber(KEY_WRONG_ATTEMPTS, next);
  return next;
}

export async function resetWrongAttempts(): Promise<void> {
  await removeKey(KEY_WRONG_ATTEMPTS);
}

export async function getLockedUntil(): Promise<number | null> {
  return getNumber(KEY_LOCKED_UNTIL);
}

export async function setLockedUntil(timestamp: number): Promise<void> {
  await setNumber(KEY_LOCKED_UNTIL, timestamp);
}

export async function clearLockedUntil(): Promise<void> {
  await removeKey(KEY_LOCKED_UNTIL);
}
