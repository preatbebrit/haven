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
import { AppState, type AppStateStatus } from 'react-native';

import { setCurrentUserId } from '@/lib/current-user';
import { consumePendingWipe, wipeAllLocalData } from '@/lib/local-data-reset';
import { runProfileSchemaMigrations } from '@/lib/profile-sync';
import { SUPABASE_CONFIGURED, supabase } from '@/lib/supabase';

// Row shapes mirror the Phase 1 Supabase tables. Keep these in sync with
// supabase/migrations/20260521120000_profile_phase1.sql.

/**
 * A step name in the resumable onboarding flow. Mirrors the
 * profiles_public.onboarding_step CHECK constraint server-side.
 * Null when the user is not in onboarding (either never started or
 * completed).
 */
export type OnboardingStep =
  | 'username'
  | 'age'
  | 'lock'
  | 'gender'
  | 'pronouns'
  | 'out_status'
  | 'identities';

/**
 * Server-side draft of in-progress onboarding values. Mirrors the
 * profiles_public.onboarding_draft jsonb column. All keys optional —
 * a key is present only after the user has typed/selected that value.
 *
 * The lock PIN itself stays in local SecureStore (lib/lock-storage);
 * the draft only tracks whether the user reached the end of the
 * lockscreen step via lockscreen_completed.
 */
export type OnboardingDraft = {
  username?: string;
  date_of_birth?: string;            // ISO YYYY-MM-DD
  lockscreen_completed?: boolean;
  gender_id?: string;
  pronoun_preset?: string;
  pronouns_custom?: string | null;
  out_status?: 'yes' | 'no' | 'sort-of';
  accepting_environment?: string;
  identity_tags?: string[];
};

export type ProfilePublic = {
  id: string;
  username: string | null;
  bio: string | null;
  intro_seen: boolean;
  updated_at: string;
  onboarding_completed_at: string | null;
  onboarding_step: OnboardingStep | null;
  onboarding_draft: OnboardingDraft;
};

export type ProfilePrivate = {
  id: string;
  date_of_birth: string | null;
  gender_id: string | null;
  pronoun_preset: string | null;
  pronouns_custom: string | null;
  out_status: 'yes' | 'no' | 'sort-of' | null;
  accepting_environment: string | null;
  identity_tags: string[];
  updated_at: string;
};

// Discriminated union per §6.1 of the Phase 1 plan. The critical fix vs. the
// prior `profileUsername: string | null | undefined` shape is the `error`
// branch — a network blip on cold launch no longer silently routes existing
// users to onboarding (the boot gate reads `profileState` directly).
export type ProfileState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; public: ProfilePublic; private: ProfilePrivate }
  | { kind: 'error'; error: Error };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** True until the initial getSession() resolves. */
  loading: boolean;
  /** Source of truth for the loaded profile. New code should read this. */
  profileState: ProfileState;
  /**
   * Single-attempt fetch — refreshes profileState. Use for ad-hoc refreshes
   * (e.g. after a settings write).
   */
  refreshProfile: () => Promise<void>;
  /**
   * 3-attempt fetch with 500/1000/2000 ms backoff. Use after a write whose
   * success the user needs to feel — most notably onboarding completion —
   * where a transient post-RPC refresh failure shouldn't bounce the user to
   * the error screen. See §6.5 of the Phase 1 plan.
   */
  refreshProfileWithRetry: () => Promise<ProfileState>;
  /**
   * @deprecated Read `profileState` instead. Kept for backward compatibility
   * with app/auth/email.tsx (uncommitted pre-existing work in the tree) and
   * any straggler call site that still expects the old sentinel pattern:
   *   undefined = not queried, null = no profile / signed out / error,
   *   string   = loaded with username.
   *
   * The error → null mapping preserves the legacy bug where a fetch failure
   * read as "needs onboarding". The new boot gate in app/index.tsx uses
   * `profileState` to avoid that misrouting; this derived field exists only
   * so legacy consumers keep behaving exactly as they did before chunk 2.
   */
  profileUsername: string | null | undefined;
  /**
   * Tri-valued onboarding completion sentinel. Mirrors profileUsername's
   * semantics but for the explicit onboarding_completed_at column.
   *   undefined = loading/unresolved
   *   false     = loaded but not yet completed (route to /onboarding)
   *   true      = loaded and completed (route to main app)
   *
   * Authoritative source for routing decisions in the auth flow.
   */
  profileOnboardingCompleted: boolean | undefined;
  /**
   * Write-through helper. Merges a patch into the loaded profiles_public row.
   * No-op when profileState isn't 'loaded' — callers are settings screens
   * gated behind the boot gate, so the loaded branch is the expected case.
   * Synchronous: the Supabase write is the caller's responsibility; this
   * only updates local React state so dependent screens render the new value
   * immediately (chunk 2 removed the focus-effect refetch). See §A.
   */
  updateProfilePublic: (patch: Partial<ProfilePublic>) => void;
  /** Same contract as updateProfilePublic, for profiles_private. */
  updateProfilePrivate: (patch: Partial<ProfilePrivate>) => void;
  signOut: (options?: { scope?: 'global' | 'local' | 'others' }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileState, setProfileState] = useState<ProfileState>({ kind: 'idle' });
  const mountedRef = useRef(true);
  // Guards against re-running migrations on every AppState 'active' or
  // auth-event tick. Idempotent against the @haven/profile_schema_version key
  // anyway, but the ref keeps the AsyncStorage read out of the hot path.
  const migrationsRanRef = useRef(false);
  // Tracks the most recent user we kicked a fetch for. Lets the parallel
  // fetch and AppState recovery effect both check session.user.id without
  // re-running effects on identical IDs.
  const lastFetchedUserIdRef = useRef<string | null>(null);

  // Parallel fetch of both rows. profiles_public is universally readable
  // by authenticated users; profiles_private is owner-only — for own-user
  // reads, RLS allows it. See §6.2 of the Phase 1 plan.
  const loadProfile = useCallback(async (userId: string): Promise<ProfileState> => {
    try {
      const [pubResult, privResult] = await Promise.all([
        supabase.from('profiles_public').select('*').eq('id', userId).maybeSingle(),
        supabase.from('profiles_private').select('*').eq('id', userId).maybeSingle(),
      ]);

      if (pubResult.error) {
        return {
          kind: 'error',
          error: new Error(
            `profiles_public fetch failed: ${pubResult.error.message} (code=${pubResult.error.code ?? 'unknown'})`,
          ),
        };
      }
      if (privResult.error) {
        return {
          kind: 'error',
          error: new Error(
            `profiles_private fetch failed: ${privResult.error.message} (code=${privResult.error.code ?? 'unknown'})`,
          ),
        };
      }
      if (!pubResult.data || !privResult.data) {
        // Either row missing — most likely a handle_new_user trigger race or
        // corruption. Treat as error (recoverable via retry) rather than
        // "needs onboarding", per the user-enumeration discussion in the plan.
        return { kind: 'error', error: new Error('profile_row_missing') };
      }
      return {
        kind: 'loaded',
        public: pubResult.data as ProfilePublic,
        private: privResult.data as ProfilePrivate,
      };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return { kind: 'error', error: err };
    }
  }, []);

  // Fetch-and-commit for a specific userId. Sets loading on entry and writes
  // the final state on exit (only if still mounted). Safe to call multiple
  // times — later writes win.
  const refreshProfileForUser = useCallback(
    async (userId: string): Promise<ProfileState> => {
      if (!mountedRef.current) return { kind: 'idle' };
      setProfileState({ kind: 'loading' });
      lastFetchedUserIdRef.current = userId;
      const next = await loadProfile(userId);
      if (!mountedRef.current) return next;
      // Only write if we're still the most-recent fetch and the user hasn't
      // signed out since this call started.
      if (lastFetchedUserIdRef.current === userId) {
        setProfileState(next);
      }
      return next;
    },
    [loadProfile],
  );

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!session) return;
    await refreshProfileForUser(session.user.id);
  }, [session, refreshProfileForUser]);

  // 3-attempt retry with 500/1000/2000ms backoff (per §6.5 of the plan).
  // Returns the final ProfileState rather than throwing so callers can
  // branch on the result — e.g. onboarding's finish() decides whether to
  // navigate to tabs or to the boot-gate error screen based on this.
  const refreshProfileWithRetry = useCallback(async (): Promise<ProfileState> => {
    if (!session) return { kind: 'idle' };
    const userId = session.user.id;
    const delays = [500, 1000, 2000];
    if (mountedRef.current) setProfileState({ kind: 'loading' });
    lastFetchedUserIdRef.current = userId;

    let last: ProfileState = { kind: 'loading' };
    for (let i = 0; i < 3; i += 1) {
      last = await loadProfile(userId);
      if (last.kind === 'loaded') break;
      // No delay after the final attempt.
      if (i < 2) {
        await new Promise<void>((resolve) => setTimeout(resolve, delays[i]));
      }
    }

    if (mountedRef.current && lastFetchedUserIdRef.current === userId) {
      setProfileState(last);
    }
    return last;
  }, [session, loadProfile]);

  const applySession = useCallback(
    (next: Session | null) => {
      setSession(next);
      setCurrentUserId(next?.user.id ?? null);
      if (next) {
        // Reset to loading so the boot gate waits for the fresh fetch instead
        // of routing on stale data left over from a prior session.
        void refreshProfileForUser(next.user.id);
      } else {
        lastFetchedUserIdRef.current = null;
        setProfileState({ kind: 'idle' });
      }
    },
    [refreshProfileForUser],
  );

  useEffect(() => {
    mountedRef.current = true;

    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      setProfileState({ kind: 'idle' });
      return () => {
        mountedRef.current = false;
      };
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      // Crash-recovery: the delete-account flow marks @haven/pending_local_wipe_v1
      // before its network call. If a crash happened between server delete and
      // local wipe, the SecureStore session may still hold a token for a deleted
      // user. Consume the tombstone before subscribing, then signOut to drop that
      // stale token so INITIAL_SESSION fires with null instead of a ghost session.
      try {
        const wiped = await consumePendingWipe();
        if (wiped) {
          try {
            await supabase.auth.signOut();
          } catch {
            /* non-fatal */
          }
        }
      } catch {
        /* non-fatal — boot continues either way */
      }

      // One-shot client-schema migration. Idempotent against the
      // @haven/profile_schema_version key in AsyncStorage; the ref keeps
      // the read out of subsequent renders / AppState changes.
      if (!migrationsRanRef.current) {
        migrationsRanRef.current = true;
        await runProfileSchemaMigrations();
      }

      if (cancelled || !mountedRef.current) return;

      // INITIAL_SESSION fires once on subscribe with the rehydrated session
      // (or null). Single source of truth for auth state.
      const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (!mountedRef.current) return;
        applySession(nextSession);
        if (event === 'INITIAL_SESSION') setLoading(false);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (unsubscribe) unsubscribe();
    };
  }, [applySession]);

  // AppState recovery: foregrounding while profileState is in 'error' silently
  // re-attempts the fetch (per §6.2). Single attempt — not the 3-retry helper,
  // which is reserved for post-onboarding submission where the user is
  // emotionally invested in a successful transition.
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (status !== 'active') return;
      if (!mountedRef.current) return;
      if (profileState.kind !== 'error') return;
      if (!session) return;
      void refreshProfileForUser(session.user.id);
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [profileState.kind, session, refreshProfileForUser]);

  const signOut = useCallback(
    async (options?: { scope?: 'global' | 'local' | 'others' }) => {
      await supabase.auth.signOut(options);
      try {
        await wipeAllLocalData();
      } catch (e) {
        console.warn('[auth] local wipe after sign-out failed:', e);
      }
    },
    [],
  );

  // Write-through helpers (§A of chunk 3). Functional setState avoids stale
  // closures when multiple patches land in the same React batch.
  const updateProfilePublic = useCallback((patch: Partial<ProfilePublic>) => {
    setProfileState((prev) => {
      if (prev.kind !== 'loaded') return prev;
      return { ...prev, public: { ...prev.public, ...patch } };
    });
  }, []);

  const updateProfilePrivate = useCallback((patch: Partial<ProfilePrivate>) => {
    setProfileState((prev) => {
      if (prev.kind !== 'loaded') return prev;
      return { ...prev, private: { ...prev.private, ...patch } };
    });
  }, []);

  // Legacy backward-compat field. 'undefined' = "loading or unresolved",
  // 'null' = "explicitly absent (i.e., loaded but no username)", string = "have it".
  // Both 'idle' and 'error' return undefined so callers wait rather than
  // misroute to onboarding on transient states. The new boot gate in
  // app/index.tsx reads profileState directly and doesn't depend on this.
  const profileUsername = useMemo<string | null | undefined>(() => {
    switch (profileState.kind) {
      case 'loading':
        return undefined;
      case 'loaded':
        return profileState.public.username;
      case 'idle':
      case 'error':
        return undefined;
    }
  }, [profileState]);

  // Tri-valued onboarding completion sentinel. Mirrors profileUsername's
  // semantics but for the explicit onboarding_completed_at column. The boot
  // gate (app/index.tsx) and post-auth routing (app/auth/email.tsx) both
  // read this instead of profileUsername — closes the bypass where a user
  // with a username but onboarding_completed_at = null could reach tabs by
  // back-navigating out of /onboarding.
  const profileOnboardingCompleted = useMemo<boolean | undefined>(() => {
    switch (profileState.kind) {
      case 'loading':
      case 'idle':
      case 'error':
        return undefined;
      case 'loaded':
        return !!profileState.public.onboarding_completed_at;
    }
  }, [profileState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      profileState,
      refreshProfile,
      refreshProfileWithRetry,
      profileUsername,
      profileOnboardingCompleted,
      updateProfilePublic,
      updateProfilePrivate,
      signOut,
    }),
    [
      session,
      loading,
      profileState,
      refreshProfile,
      refreshProfileWithRetry,
      profileUsername,
      profileOnboardingCompleted,
      updateProfilePublic,
      updateProfilePrivate,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
