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

import { useAuth, type OnboardingDraft, type OnboardingStep } from '@/contexts/auth-context';
import { isoToMmddyyyy } from '@/lib/date-input';
import { supabase } from '@/lib/supabase';

export type OutStatus = 'yes' | 'no' | 'sort-of';

export type OnboardingContextValue = {
  username: string;
  setUsername: (v: string) => void;
  dateOfBirth: string;
  setDateOfBirth: (v: string) => void;
  lockPin: string | null;
  setLockPin: (v: string | null) => void;
  lockSkipped: boolean;
  setLockSkipped: (v: boolean) => void;
  genderId: string | null;
  setGenderId: (v: string | null) => void;
  pronounPreset: string | null;
  setPronounPreset: (v: string | null) => void;
  pronounsCustom: string;
  setPronounsCustom: (v: string) => void;
  outStatus: OutStatus | null;
  setOutStatus: (v: OutStatus | null) => void;
  acceptingEnvironment: string | null;
  setAcceptingEnvironment: (v: string | null) => void;
  identities: string[];
  setIdentities: (v: string[]) => void;
  toggleIdentity: (id: string) => void;
  currentStep: OnboardingStep | null;
  setCurrentStep: (step: OnboardingStep | null) => void;
  saveDraft: (updates: Partial<OnboardingDraft>) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [lockPin, setLockPin] = useState<string | null>(null);
  const [lockSkipped, setLockSkipped] = useState(false);
  const [genderId, setGenderId] = useState<string | null>(null);
  const [pronounPreset, setPronounPreset] = useState<string | null>(null);
  const [pronounsCustom, setPronounsCustom] = useState('');
  const [outStatus, setOutStatus] = useState<OutStatus | null>(null);
  const [acceptingEnvironment, setAcceptingEnvironment] = useState<string | null>(null);
  const [identities, setIdentities] = useState<string[]>([]);

  const { profileState, updateProfilePublic } = useAuth();

  // Hydration: when the auth context loads a profile, seed local state
  // from the persisted draft. Runs once per profileState transition to
  // 'loaded' — guarded by a ref so re-renders don't re-seed and stomp on
  // typing in progress.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (profileState.kind !== 'loaded') {
      // Profile unloaded (sign-out, error). Reset the latch so the next
      // load re-hydrates fresh.
      hydratedRef.current = false;
      return;
    }
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const draft = profileState.public.onboarding_draft;
    if (draft.username !== undefined) setUsername(draft.username);
    if (draft.date_of_birth !== undefined) {
      setDateOfBirth(isoToMmddyyyy(draft.date_of_birth));
    }
    if (draft.gender_id !== undefined) setGenderId(draft.gender_id);
    if (draft.pronoun_preset !== undefined) setPronounPreset(draft.pronoun_preset);
    if (draft.pronouns_custom !== undefined && draft.pronouns_custom !== null) {
      setPronounsCustom(draft.pronouns_custom);
    }
    if (draft.out_status !== undefined) setOutStatus(draft.out_status);
    if (draft.accepting_environment !== undefined) {
      setAcceptingEnvironment(draft.accepting_environment);
    }
    if (draft.identity_tags !== undefined) setIdentities(draft.identity_tags);
    // Note: lockPin and lockSkipped stay local-only. The draft holds
    // `lockscreen_completed` only, which we don't translate back to a
    // PIN — the user is asked to set the PIN again on this device if
    // they're resuming from a different device.
  }, [profileState]);

  // Persistence helpers. saveDraft merges a partial update into the
  // server-side draft and the in-memory profile copy. setCurrentStep
  // does the same for the step pointer. Both silent on failure — the
  // draft is a UX enhancement, not data integrity. Final commit happens
  // via complete_onboarding.
  const saveDraft = useCallback(
    async (updates: Partial<OnboardingDraft>) => {
      if (profileState.kind !== 'loaded') return;
      const merged: OnboardingDraft = {
        ...profileState.public.onboarding_draft,
        ...updates,
      };
      const { error } = await supabase
        .from('profiles_public')
        .update({ onboarding_draft: merged })
        .eq('id', profileState.public.id);
      if (error) {
        console.warn('[onboarding-context] saveDraft failed:', error.message);
        return;
      }
      updateProfilePublic({ onboarding_draft: merged });
    },
    [profileState, updateProfilePublic],
  );

  const setCurrentStep = useCallback(
    async (step: OnboardingStep | null) => {
      if (profileState.kind !== 'loaded') return;
      const { error } = await supabase
        .from('profiles_public')
        .update({ onboarding_step: step })
        .eq('id', profileState.public.id);
      if (error) {
        console.warn('[onboarding-context] setCurrentStep failed:', error.message);
        return;
      }
      updateProfilePublic({ onboarding_step: step });
    },
    [profileState, updateProfilePublic],
  );

  // Derived: current step as read from server state. Local state
  // doesn't track this; the screen reads it via useOnboarding for
  // resume routing.
  const currentStep: OnboardingStep | null =
    profileState.kind === 'loaded' ? profileState.public.onboarding_step : null;

  const toggleIdentity = useCallback((id: string) => {
    setIdentities((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const value = useMemo(
    () => ({
      username,
      setUsername,
      dateOfBirth,
      setDateOfBirth,
      lockPin,
      setLockPin,
      lockSkipped,
      setLockSkipped,
      genderId,
      setGenderId,
      pronounPreset,
      setPronounPreset,
      pronounsCustom,
      setPronounsCustom,
      outStatus,
      setOutStatus,
      acceptingEnvironment,
      setAcceptingEnvironment,
      identities,
      setIdentities,
      toggleIdentity,
      currentStep,
      setCurrentStep,
      saveDraft,
    }),
    [
      username,
      dateOfBirth,
      lockPin,
      lockSkipped,
      genderId,
      pronounPreset,
      pronounsCustom,
      outStatus,
      acceptingEnvironment,
      identities,
      toggleIdentity,
      currentStep,
      setCurrentStep,
      saveDraft,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return ctx;
}
