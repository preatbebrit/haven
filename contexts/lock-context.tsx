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

import {
  LOCK_BACKGROUND_TIMEOUT_MS,
  LOCK_MAX_ATTEMPTS,
  LOCK_TIMEOUT_MS,
  clearLockedUntil,
  getLastUnlockedAt,
  getLockedUntil,
  getWrongAttempts,
  incrementWrongAttempts,
  markUnlocked as persistMarkUnlocked,
  resetWrongAttempts,
  setLockedUntil,
} from '@/lib/lock-storage';
import { getProfile } from '@/lib/profile-storage';

export type UnlockResult =
  | { kind: 'correct' }
  | { kind: 'wrong'; attempts: number }
  | { kind: 'locked-out'; until: number };

type LockContextValue = {
  isHydrated: boolean;
  isLocked: boolean;
  lockedUntil: number | null;
  tryUnlock: (pin: string) => Promise<UnlockResult>;
  markUnlocked: () => Promise<void>;
  refreshPin: () => Promise<void>;
};

const LockContext = createContext<LockContextValue | null>(null);

export function LockProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedUntil, setLockedUntilState] = useState<number | null>(null);

  // Cached PIN state, refreshed on mount and via refreshPin().
  // Ref so AppState/auto-submit callbacks always read the latest value.
  const pinRef = useRef<string | null>(null);
  const hasActiveLock = (): boolean => Boolean(pinRef.current);

  const loadPin = useCallback(async (): Promise<string | null> => {
    const profile = await getProfile();
    const active = profile.lockPin && !profile.lockSkipped ? profile.lockPin : null;
    pinRef.current = active;
    return active;
  }, []);

  // Hydrate from storage on mount: read PIN, decide initial locked state from
  // the last-unlocked timestamp (cold launch always re-locks if PIN exists),
  // and restore any in-flight lockout timer.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pin = await loadPin();
      const [until] = await Promise.all([getLockedUntil()]);
      if (cancelled) return;
      const now = Date.now();
      if (until && until > now) {
        setLockedUntilState(until);
      } else if (until) {
        await clearLockedUntil();
      }
      setIsLocked(Boolean(pin));
      setIsHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPin]);

  // Auto-lock on foregrounding after the background timeout. Cold launch is
  // handled by the hydration effect above; this only covers warm returns.
  useEffect(() => {
    const onChange = async (status: AppStateStatus) => {
      if (status !== 'active') return;
      if (!hasActiveLock()) return;
      if (isLocked) return;
      const last = await getLastUnlockedAt();
      if (last == null || Date.now() - last >= LOCK_BACKGROUND_TIMEOUT_MS) {
        setIsLocked(true);
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [isLocked]);

  // Tick the lockout expiry. When the timer expires we just clear the gate;
  // the UI re-enables the keypad on the next render.
  useEffect(() => {
    if (lockedUntil == null) return;
    const remaining = lockedUntil - Date.now();
    if (remaining <= 0) {
      setLockedUntilState(null);
      void clearLockedUntil();
      return;
    }
    const timeout = setTimeout(() => {
      setLockedUntilState(null);
      void clearLockedUntil();
    }, remaining);
    return () => clearTimeout(timeout);
  }, [lockedUntil]);

  const markUnlocked = useCallback(async () => {
    await persistMarkUnlocked();
    await resetWrongAttempts();
    await clearLockedUntil();
    setLockedUntilState(null);
    setIsLocked(false);
  }, []);

  // Validates without dismissing. The overlay plays the success animation
  // and then calls markUnlocked() to actually drop the gate — otherwise the
  // overlay unmounts before the green flash is visible.
  const tryUnlock = useCallback(async (pin: string): Promise<UnlockResult> => {
    const now = Date.now();
    if (lockedUntil != null && lockedUntil > now) {
      return { kind: 'locked-out', until: lockedUntil };
    }
    const stored = pinRef.current;
    if (stored && pin === stored) {
      return { kind: 'correct' };
    }
    const attempts = await incrementWrongAttempts();
    if (attempts >= LOCK_MAX_ATTEMPTS) {
      const until = Date.now() + LOCK_TIMEOUT_MS;
      await setLockedUntil(until);
      await resetWrongAttempts();
      setLockedUntilState(until);
      return { kind: 'locked-out', until };
    }
    return { kind: 'wrong', attempts };
  }, [lockedUntil]);

  const refreshPin = useCallback(async () => {
    const pin = await loadPin();
    // If the active PIN was cleared (settings turn-off or account reset),
    // drop the locked state so the overlay dismisses immediately.
    if (!pin) {
      setIsLocked(false);
      setLockedUntilState(null);
      await clearLockedUntil();
    }
  }, [loadPin]);

  const value = useMemo<LockContextValue>(
    () => ({
      isHydrated,
      isLocked,
      lockedUntil,
      tryUnlock,
      markUnlocked,
      refreshPin,
    }),
    [isHydrated, isLocked, lockedUntil, tryUnlock, markUnlocked, refreshPin],
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock(): LockContextValue {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used within LockProvider');
  return ctx;
}
