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

import { useAuth } from '@/contexts/auth-context';
import {
  LOCK_BACKGROUND_TIMEOUT_MS,
  LOCK_MAX_ATTEMPTS,
  LOCK_TIMEOUT_MS,
  clearLockedUntil,
  getLastUnlockedAt,
  getLockConfig,
  getLockedUntil,
  incrementWrongAttempts,
  markUnlocked as persistMarkUnlocked,
  resetWrongAttempts,
  runLockMigrationV2,
  setLockConfig,
  setLockedUntil,
} from '@/lib/lock-storage';

export type UnlockResult =
  | { kind: 'correct' }
  | { kind: 'wrong'; attempts: number }
  | { kind: 'locked-out'; until: number };

type LockContextValue = {
  isHydrated: boolean;
  isLocked: boolean;
  lockedUntil: number | null;
  /** True if the signed-in user has an active PIN (not skipped, non-empty). */
  hasActivePin: boolean;
  tryUnlock: (pin: string) => Promise<UnlockResult>;
  markUnlocked: () => Promise<void>;
  /** Set or replace the current user's PIN. No-op if signed out. */
  setLockPin: (pin: string) => Promise<void>;
  /** Turn the lock off for the current user. No-op if signed out. */
  clearLockPin: () => Promise<void>;
};

const LockContext = createContext<LockContextValue | null>(null);

export function LockProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [isHydrated, setIsHydrated] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedUntil, setLockedUntilState] = useState<number | null>(null);
  const [hasActivePin, setHasActivePin] = useState(false);

  // Cached PIN, refreshed when the signed-in user changes or when the user
  // updates the PIN through this context. Ref so AppState / auto-submit
  // callbacks always read the latest value.
  const pinRef = useRef<string | null>(null);

  // Run the one-time v2 migration before any reads so legacy device-wide
  // lock data is gone before we touch the per-user namespace.
  const migrationRanRef = useRef(false);
  useEffect(() => {
    if (migrationRanRef.current) return;
    migrationRanRef.current = true;
    void runLockMigrationV2();
  }, []);

  // Single source of truth for "what's the lock state for the current user."
  // Fires on:
  //   - cold launch with a stored session (AuthProvider's INITIAL_SESSION),
  //   - sign-in (new userId appears),
  //   - sign-out (userId becomes null) — clears in-memory state but never
  //     touches the previous user's on-disk PIN, so it survives for their
  //     next sign-in on this device,
  //   - account switch (userId changes to a different non-null id) — reads
  //     only the new user's namespace, so the previous user's PIN is
  //     unreachable.
  //
  // Every sign-in with an active PIN sets isLocked=true. No grace-period
  // carve-out: sign-in is treated as a high-trust event and always
  // challenges. The boot gate in app/index.tsx waits for auth + profile to
  // resolve before routing, so the overlay is in place before the
  // post-sign-in screen mounts.
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      pinRef.current = null;
      setHasActivePin(false);
      setIsLocked(false);
      setLockedUntilState(null);
      setIsHydrated(true);
      return;
    }

    setIsHydrated(false);
    (async () => {
      const config = await getLockConfig(userId);
      const active = config.pin && !config.skipped ? config.pin : null;
      const until = await getLockedUntil(userId);
      if (cancelled) return;

      pinRef.current = active;
      setHasActivePin(Boolean(active));

      const now = Date.now();
      if (until && until > now) {
        setLockedUntilState(until);
      } else {
        if (until) await clearLockedUntil(userId);
        setLockedUntilState(null);
      }

      setIsLocked(Boolean(active));
      setIsHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Auto-lock on foregrounding after the background timeout. Sign-in is
  // handled by the userId effect above; this only covers warm returns
  // within an existing session.
  useEffect(() => {
    const onChange = async (status: AppStateStatus) => {
      if (status !== 'active') return;
      if (!userId) return;
      if (!pinRef.current) return;
      if (isLocked) return;
      const last = await getLastUnlockedAt(userId);
      if (last == null || Date.now() - last >= LOCK_BACKGROUND_TIMEOUT_MS) {
        setIsLocked(true);
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [isLocked, userId]);

  // Tick the lockout expiry. When the timer expires we clear the gate;
  // the UI re-enables the keypad on the next render.
  useEffect(() => {
    if (lockedUntil == null) return;
    const remaining = lockedUntil - Date.now();
    if (remaining <= 0) {
      setLockedUntilState(null);
      if (userId) void clearLockedUntil(userId);
      return;
    }
    const timeout = setTimeout(() => {
      setLockedUntilState(null);
      if (userId) void clearLockedUntil(userId);
    }, remaining);
    return () => clearTimeout(timeout);
  }, [lockedUntil, userId]);

  const markUnlocked = useCallback(async () => {
    if (!userId) {
      setLockedUntilState(null);
      setIsLocked(false);
      return;
    }
    await persistMarkUnlocked(userId);
    await resetWrongAttempts(userId);
    await clearLockedUntil(userId);
    setLockedUntilState(null);
    setIsLocked(false);
  }, [userId]);

  // Validates without dismissing. The overlay plays the success animation
  // and then calls markUnlocked() to actually drop the gate — otherwise the
  // overlay unmounts before the green flash is visible.
  const tryUnlock = useCallback(
    async (pin: string): Promise<UnlockResult> => {
      const now = Date.now();
      if (lockedUntil != null && lockedUntil > now) {
        return { kind: 'locked-out', until: lockedUntil };
      }
      const stored = pinRef.current;
      if (stored && pin === stored) {
        return { kind: 'correct' };
      }
      if (!userId) {
        return { kind: 'wrong', attempts: 0 };
      }
      const attempts = await incrementWrongAttempts(userId);
      if (attempts >= LOCK_MAX_ATTEMPTS) {
        const until = Date.now() + LOCK_TIMEOUT_MS;
        await setLockedUntil(userId, until);
        await resetWrongAttempts(userId);
        setLockedUntilState(until);
        return { kind: 'locked-out', until };
      }
      return { kind: 'wrong', attempts };
    },
    [lockedUntil, userId],
  );

  const setLockPin = useCallback(
    async (pin: string) => {
      if (!userId) {
        // Defensive: caller should only invoke this after sign-in lands.
        // Silently dropping a PIN would be worse than failing loudly.
        throw new Error('setLockPin called with no signed-in user');
      }
      await setLockConfig(userId, { pin, skipped: false });
      pinRef.current = pin;
      setHasActivePin(true);
      // The user just typed it, so no reason to immediately challenge them.
      await persistMarkUnlocked(userId);
      await resetWrongAttempts(userId);
      await clearLockedUntil(userId);
      setLockedUntilState(null);
      setIsLocked(false);
    },
    [userId],
  );

  const clearLockPin = useCallback(async () => {
    if (!userId) {
      throw new Error('clearLockPin called with no signed-in user');
    }
    await setLockConfig(userId, { pin: null, skipped: true });
    await clearLockedUntil(userId);
    pinRef.current = null;
    setHasActivePin(false);
    setLockedUntilState(null);
    setIsLocked(false);
  }, [userId]);

  const value = useMemo<LockContextValue>(
    () => ({
      isHydrated,
      isLocked,
      lockedUntil,
      hasActivePin,
      tryUnlock,
      markUnlocked,
      setLockPin,
      clearLockPin,
    }),
    [
      isHydrated,
      isLocked,
      lockedUntil,
      hasActivePin,
      tryUnlock,
      markUnlocked,
      setLockPin,
      clearLockPin,
    ],
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock(): LockContextValue {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used within LockProvider');
  return ctx;
}
