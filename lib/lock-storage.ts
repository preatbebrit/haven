import AsyncStorage from '@react-native-async-storage/async-storage';

// Per-user namespace. Each signed-in Haven user has their own isolated lock
// state under @haven/lock_v2/<userId>/*. The PIN never leaves the device, but
// it's keyed by the Supabase user id so account A's PIN cannot gate or be
// read by account B on the same device.
const NS = '@haven/lock_v2';
const MIGRATION_KEY = '@haven/lock_migration_v2_done';

// Legacy global keys (pre-v2). The migration removes these on first launch
// of the new code so a stale PIN from device-wide storage doesn't silently
// become some account's PIN.
const LEGACY_LAST_UNLOCKED_AT = '@haven/lock_last_unlocked_at_v1';
const LEGACY_WRONG_ATTEMPTS = '@haven/lock_wrong_attempts_v1';
const LEGACY_LOCKED_UNTIL = '@haven/lock_locked_until_v1';
const LEGACY_PROFILE_KEY = '@haven/profile_v1';

// Auto-lock window: foregrounding the app after this many ms re-locks it.
export const LOCK_BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000;

// Wrong-PIN cooldown: this many bad attempts triggers a timed lockout.
export const LOCK_MAX_ATTEMPTS = 5;
export const LOCK_TIMEOUT_MS = 30 * 1000;

export type LockConfig = {
  pin: string | null;
  skipped: boolean;
};

const EMPTY_CONFIG: LockConfig = { pin: null, skipped: false };

function configKey(userId: string): string {
  return `${NS}/${userId}/config`;
}
function lastUnlockedKey(userId: string): string {
  return `${NS}/${userId}/last_unlocked_at`;
}
function wrongAttemptsKey(userId: string): string {
  return `${NS}/${userId}/wrong_attempts`;
}
function lockedUntilKey(userId: string): string {
  return `${NS}/${userId}/locked_until`;
}

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

export async function getLockConfig(userId: string): Promise<LockConfig> {
  try {
    const raw = await AsyncStorage.getItem(configKey(userId));
    if (!raw) return { ...EMPTY_CONFIG };
    const parsed = JSON.parse(raw) as Partial<LockConfig>;
    return {
      pin: typeof parsed.pin === 'string' ? parsed.pin : null,
      skipped: typeof parsed.skipped === 'boolean' ? parsed.skipped : false,
    };
  } catch {
    return { ...EMPTY_CONFIG };
  }
}

export async function setLockConfig(userId: string, config: LockConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(configKey(userId), JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

export async function getLastUnlockedAt(userId: string): Promise<number | null> {
  return getNumber(lastUnlockedKey(userId));
}

export async function markUnlocked(userId: string): Promise<void> {
  await setNumber(lastUnlockedKey(userId), Date.now());
}

export async function getWrongAttempts(userId: string): Promise<number> {
  const n = await getNumber(wrongAttemptsKey(userId));
  return n ?? 0;
}

export async function incrementWrongAttempts(userId: string): Promise<number> {
  const next = (await getWrongAttempts(userId)) + 1;
  await setNumber(wrongAttemptsKey(userId), next);
  return next;
}

export async function resetWrongAttempts(userId: string): Promise<void> {
  await removeKey(wrongAttemptsKey(userId));
}

export async function getLockedUntil(userId: string): Promise<number | null> {
  return getNumber(lockedUntilKey(userId));
}

export async function setLockedUntil(userId: string, timestamp: number): Promise<void> {
  await setNumber(lockedUntilKey(userId), timestamp);
}

export async function clearLockedUntil(userId: string): Promise<void> {
  await removeKey(lockedUntilKey(userId));
}

// Used by the delete-account flow to drop this user's lock data without
// touching anyone else's. wipeAllLocalData (lib/local-data-reset.ts) clears
// the entire @haven/* namespace and covers the broader reset case.
export async function wipeLockForUser(userId: string): Promise<void> {
  await AsyncStorage.multiRemove([
    configKey(userId),
    lastUnlockedKey(userId),
    wrongAttemptsKey(userId),
    lockedUntilKey(userId),
  ]);
}

// One-time migration on first launch of v2. Drops legacy device-wide lock
// data (PIN + runtime keys) so it can't silently become a per-user PIN.
// Idempotent via the MIGRATION_KEY guard.
export async function runLockMigrationV2(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(MIGRATION_KEY);
    if (done === '1') return;

    // Strip lockPin / lockSkipped from the legacy profile blob without
    // disturbing the other fields (username, dateOfBirth, identities, etc.).
    try {
      const raw = await AsyncStorage.getItem(LEGACY_PROFILE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if ('lockPin' in parsed || 'lockSkipped' in parsed) {
          delete parsed.lockPin;
          delete parsed.lockSkipped;
          await AsyncStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify(parsed));
        }
      }
    } catch {
      /* non-fatal — worst case the stale fields remain but are never read */
    }

    await AsyncStorage.multiRemove([
      LEGACY_LAST_UNLOCKED_AT,
      LEGACY_WRONG_ATTEMPTS,
      LEGACY_LOCKED_UNTIL,
    ]);
    await AsyncStorage.setItem(MIGRATION_KEY, '1');
  } catch {
    /* non-fatal — migration will retry on next launch */
  }
}
