import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { getAvatarColors, type GenderSymbol } from '@/components/ui/gender-avatar';
import { GENDER_OPTIONS } from '@/constants/onboarding-options';
import type { ChatUser } from '@/constants/mock-chat';
import {
  useAuth,
  type ProfilePrivate,
  type ProfilePublic,
} from '@/contexts/auth-context';
import { OUT_STATUS_TAG_LABELS } from '@/lib/profile-display';

// Onboarding GENDER_OPTIONS ids → GenderSymbol slugs used by the avatar.
// Ids without an exact symbol map to the closest visual analog. Unchanged
// from the prior file; the source of the gender_id is now the server row
// (profiles_private.gender_id) instead of AsyncStorage.
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

// Placeholder symbol when profileState isn't 'loaded'. The boot gate in
// app/index.tsx prevents the signed-in tree (tabs, profile, etc.) from
// mounting until profileState === 'loaded', so these placeholders shouldn't
// be visible to users in practice. They exist so TypeScript stays happy for
// consumers that read `me.handle` / `displayProfile.tags` directly. The
// Jane_o_0 fallback from the prior implementation is deliberately gone —
// see §6.4 of the Phase 1 plan.
const PLACEHOLDER_SYMBOL: GenderSymbol = 'pangender';

export type CurrentUserDisplayProfile = {
  handle: string;
  pronouns: string;
  avatarSymbol: GenderSymbol;
  tags: string[];
};

/** Merged profiles_public + profiles_private row. New shape per §6.4. */
export type CurrentUser = ProfilePublic & ProfilePrivate;

type CurrentUserContextValue = {
  /**
   * Chat-shaped current-user view. Null until profileState is 'loaded'. The
   * boot gate in app/index.tsx prevents the signed-in tree from mounting
   * before that, so consumers can null-check and early-return — the null
   * branch is an unreachable defensive path in practice.
   */
  me: ChatUser | null;
  /**
   * Profile-display-shaped view. Same loading semantics as `me`.
   */
  displayProfile: CurrentUserDisplayProfile | null;
  /**
   * Merged public+private row, or null when not loaded. Single source of
   * truth for new code. Both rows share the same `id`; the merge resolves
   * the `updated_at` collision by taking `profiles_private.updated_at` —
   * if a consumer needs both, read `profileState` from useAuth() directly.
   */
  currentUser: CurrentUser | null;
  /** True while the profile is being fetched or hasn't been queried yet. */
  isLoading: boolean;
  /**
   * Triggers an auth-context profile refresh. Backward-compat shim — kept
   * because hooks/use-reset-account.ts and hooks/use-delete-account.ts both
   * call it after a wipe to force a re-read. New code should call
   * `useAuth().refreshProfile()` directly.
   */
  refresh: () => Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

function buildFromLoaded(
  pub: ProfilePublic,
  priv: ProfilePrivate,
): { me: ChatUser; displayProfile: CurrentUserDisplayProfile } {
  const handle = pub.username?.trim() ?? '';
  const pronouns =
    (priv.pronouns_custom?.trim() || priv.pronoun_preset) ?? '';
  const avatarSymbol: GenderSymbol = priv.gender_id
    ? GENDER_ID_TO_SYMBOL[priv.gender_id] ?? PLACEHOLDER_SYMBOL
    : PLACEHOLDER_SYMBOL;
  const avatarColor = handle ? getAvatarColors(handle).bg : '#000000';

  const genderTitle = priv.gender_id
    ? GENDER_OPTIONS.find((g) => g.id === priv.gender_id)?.title
    : undefined;
  const tags: string[] = [];
  if (genderTitle) tags.push(genderTitle);
  if (priv.out_status) tags.push(OUT_STATUS_TAG_LABELS[priv.out_status]);
  tags.push(...priv.identity_tags);

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
      tags,
    },
  };
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { profileState, refreshProfile } = useAuth();

  const derived = useMemo(() => {
    if (profileState.kind === 'loaded') {
      const built = buildFromLoaded(profileState.public, profileState.private);
      return {
        me: built.me,
        displayProfile: built.displayProfile,
        currentUser: { ...profileState.public, ...profileState.private } as CurrentUser,
        isLoading: false,
      };
    }
    return {
      me: null,
      displayProfile: null,
      currentUser: null,
      isLoading: profileState.kind === 'loading',
    };
  }, [profileState]);

  const refresh = useCallback(async () => {
    await refreshProfile();
  }, [refreshProfile]);

  const value = useMemo<CurrentUserContextValue>(
    () => ({
      me: derived.me,
      displayProfile: derived.displayProfile,
      currentUser: derived.currentUser,
      isLoading: derived.isLoading,
      refresh,
    }),
    [derived, refresh],
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
