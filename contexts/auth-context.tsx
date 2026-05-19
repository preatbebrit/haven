import type { Session, User } from '@supabase/supabase-js';
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

import { setCurrentUserId } from '@/lib/current-user';
import { SUPABASE_CONFIGURED, supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** True until the initial getSession() resolves. */
  loading: boolean;
  /**
   * undefined = haven't queried yet, null = no profile row / no username set,
   * string = profile complete enough to enter the app.
   */
  profileUsername: string | null | undefined;
  /** Re-read profiles.username for the current user. Call after onboarding completes. */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileUsername, setProfileUsername] = useState<string | null | undefined>(undefined);
  const mountedRef = useRef(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();
    if (!mountedRef.current) return;
    if (error) {
      console.warn('[auth] profile lookup failed', error.code, error.message);
      setProfileUsername(null);
      return;
    }
    setProfileUsername(data?.username ?? null);
  }, []);

  const applySession = useCallback(
    (next: Session | null) => {
      setSession(next);
      setCurrentUserId(next?.user.id ?? null);
      if (next) {
        // Reset to the "haven't queried yet" sentinel so the boot gate in
        // app/index.tsx waits for loadProfile instead of routing on stale data.
        // Without this, a stale `null` from a prior sign-out makes the gate
        // briefly route to /onboarding before the profile lookup resolves.
        setProfileUsername(undefined);
        void loadProfile(next.user.id);
      } else {
        setProfileUsername(null);
      }
    },
    [loadProfile],
  );

  useEffect(() => {
    mountedRef.current = true;

    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      setProfileUsername(null);
      return () => {
        mountedRef.current = false;
      };
    }

    // Single source of truth for auth state. INITIAL_SESSION fires once on
    // subscribe with the rehydrated session (or null) — no need for a separate
    // getSession() call, which only added a second applySession that raced the
    // first loadProfile against the JWT being attached to PostgREST headers
    // (anon role → 42501 permission denied warning on cold launches).
    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mountedRef.current) return;
      applySession(nextSession);
      if (event === 'INITIAL_SESSION') setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      profileUsername,
      refreshProfile,
      signOut,
    }),
    [session, loading, profileUsername, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
