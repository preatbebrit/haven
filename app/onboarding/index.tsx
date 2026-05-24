import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingHeader } from '@/components/onboarding/onboarding-header';
import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { StepAge } from '@/components/onboarding/steps/step-age';
import { StepGender } from '@/components/onboarding/steps/step-gender';
import { StepIdentities } from '@/components/onboarding/steps/step-identities';
import { StepLock } from '@/components/onboarding/steps/step-lock';
import { StepOutStatus } from '@/components/onboarding/steps/step-out-status';
import { StepPronouns } from '@/components/onboarding/steps/step-pronouns';
import { StepUsername } from '@/components/onboarding/steps/step-username';
import { useAuth, type OnboardingStep } from '@/contexts/auth-context';
import { useLock } from '@/contexts/lock-context';
import { useOnboarding } from '@/contexts/onboarding-context';
import {
  StepFlowContext,
  type StepFlowPrimaryButton,
  type StepFlowSecondaryButton,
  type StepFlowValue,
} from '@/contexts/step-flow-context';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mmddyyyyToIso } from '@/lib/date-input';
import { supabase } from '@/lib/supabase';

const TOTAL_STEPS = 7;

const STEP_NAMES = [
  null,        // index 0 — unused
  'username',  // 1
  'age',       // 2
  'lock',      // 3
  'gender',    // 4
  'pronouns',  // 5
  'out_status', // 6
  'identities', // 7
] as const;

// Reverse of STEP_NAMES for resume routing — given a persisted onboarding_step,
// mount the screen at the matching numeric step instead of 1.
const STEP_NUMBERS: Record<OnboardingStep, number> = {
  username: 1,
  age: 2,
  lock: 3,
  gender: 4,
  pronouns: 5,
  out_status: 6,
  identities: 7,
};

// Spec: 280 ms cross-fade/slide. Outgoing body translates 32 px, incoming enters
// from the full content-width. Easing.out(cubic) on both.
const TRANSITION_MS = 280;
const OUTGOING_OFFSET = 32;

type StepProps = { isActive: boolean };

function renderStep(step: number, props: StepProps) {
  switch (step) {
    case 1:
      return <StepUsername {...props} />;
    case 2:
      return <StepAge {...props} />;
    case 3:
      return <StepLock {...props} />;
    case 4:
      return <StepGender {...props} />;
    case 5:
      return <StepPronouns {...props} />;
    case 6:
      return <StepOutStatus {...props} />;
    case 7:
      return <StepIdentities {...props} />;
    default:
      return null;
  }
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const onboarding = useOnboarding();
  const { saveDraft, setCurrentStep } = onboarding;
  const { session, profileState, refreshProfileWithRetry } = useAuth();
  const lock = useLock();

  // Resume from the server-persisted step if the user has one (chunk 3).
  // For a brand-new user (no draft yet) profileState may still be 'loading'
  // here — that's fine, initialStep falls back to 1 and the user starts at
  // username. The boot gate (app/index.tsx) doesn't route to /onboarding
  // until profileState is 'loaded' or 'error', so by the time this screen
  // mounts we'll usually have the step.
  const initialStep =
    profileState.kind === 'loaded' && profileState.public.onboarding_step
      ? STEP_NUMBERS[profileState.public.onboarding_step]
      : 1;
  const [step, setStep] = useState(initialStep);
  // Previous step kept mounted during an exit animation, then cleared to null.
  const [prevStep, setPrevStep] = useState<number | null>(null);
  const directionRef = useRef<'forward' | 'backward'>('forward');
  const [bodyWidth, setBodyWidth] = useState(0);

  const [primary, setPrimary] = useState<StepFlowPrimaryButton>({
    label: 'Next',
    inactive: true,
    onPress: () => {},
  });
  const [secondary, setSecondary] = useState<StepFlowSecondaryButton | null>(null);
  const [backOverride, setBackOverride] = useState<(() => void) | null>(null);

  const currTX = useSharedValue(0);
  const currOpacity = useSharedValue(1);
  const prevTX = useSharedValue(0);
  const prevOpacity = useSharedValue(1);

  const clearPrev = useCallback(() => setPrevStep(null), []);

  const runTransition = useCallback(
    (width: number) => {
      if (width === 0) {
        clearPrev();
        return;
      }
      const dir = directionRef.current === 'forward' ? 1 : -1;
      currTX.value = width * dir;
      currOpacity.value = 0;
      prevTX.value = 0;
      prevOpacity.value = 1;

      prevTX.value = withTiming(-OUTGOING_OFFSET * dir, {
        duration: TRANSITION_MS,
        easing: Easing.out(Easing.cubic),
      });
      prevOpacity.value = withTiming(0, {
        duration: TRANSITION_MS,
        easing: Easing.out(Easing.cubic),
      });
      currTX.value = withTiming(0, { duration: TRANSITION_MS, easing: Easing.out(Easing.cubic) });
      currOpacity.value = withTiming(
        1,
        { duration: TRANSITION_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(clearPrev)();
        },
      );
    },
    [clearPrev, currOpacity, currTX, prevOpacity, prevTX],
  );

  useEffect(() => {
    if (prevStep === null) return;
    runTransition(bodyWidth);
  }, [prevStep, bodyWidth, runTransition]);

  // Ref latch: setCurrentStep's identity changes after every profile update
  // (its useCallback closes over profileState), so without this guard the
  // effect would re-fire after every advance and stomp the step back to
  // 'username'. Mirrors the hydratedRef pattern in onboarding-context.
  const initialStepWrittenRef = useRef(false);
  useEffect(() => {
    if (initialStepWrittenRef.current) return;
    if (profileState.kind !== 'loaded') return;
    initialStepWrittenRef.current = true;
    // If a step is already persisted (user is resuming), leave it alone —
    // the initial useState above already picked it up. Otherwise this is a
    // new user reaching onboarding for the first time; record step 1.
    if (!profileState.public.onboarding_step) {
      setCurrentStep('username');
    }
  }, [profileState, setCurrentStep]);

  // Save the draft fields associated with the step the user just exited.
  // Step → fields mapping mirrors how steps are renderered in renderStep.
  const saveStepDraft = useCallback((leavingStep: number) => {
    switch (leavingStep) {
      case 1: // username
        if (onboarding.username) saveDraft({ username: onboarding.username });
        return;
      case 2: { // age
        const iso = mmddyyyyToIso(onboarding.dateOfBirth);
        if (iso) saveDraft({ date_of_birth: iso });
        return;
      }
      case 3: // lock — saved inline by step-lock.tsx itself
        return;
      case 4: // gender
        if (onboarding.genderId) saveDraft({ gender_id: onboarding.genderId });
        return;
      case 5: // pronouns
        if (onboarding.pronounPreset) {
          saveDraft({
            pronoun_preset: onboarding.pronounPreset,
            pronouns_custom: onboarding.pronounsCustom || null,
          });
        }
        return;
      case 6: // out_status
        if (onboarding.outStatus && onboarding.acceptingEnvironment) {
          saveDraft({
            out_status: onboarding.outStatus,
            accepting_environment: onboarding.acceptingEnvironment,
          });
        }
        return;
      case 7: // identities — handled by complete_onboarding, no need to save
        return;
    }
  }, [
    onboarding.username,
    onboarding.dateOfBirth,
    onboarding.genderId,
    onboarding.pronounPreset,
    onboarding.pronounsCustom,
    onboarding.outStatus,
    onboarding.acceptingEnvironment,
    saveDraft,
  ]);

  const advance = useCallback(() => {
    setStep((s) => {
      if (s >= TOTAL_STEPS) return s;
      directionRef.current = 'forward';
      setPrevStep(s);
      const nextStep = s + 1;
      // Update the server-side step pointer so resume routes here on next
      // launch. Pass the step we're arriving at.
      if (nextStep <= TOTAL_STEPS) {
        setCurrentStep(STEP_NAMES[nextStep]);
      }
      return nextStep;
    });
  }, [setCurrentStep]);

  const retreat = useCallback(() => {
    setStep((s) => {
      if (s <= 1) return s;
      directionRef.current = 'backward';
      setPrevStep(s);
      const nextStep = s - 1;
      // Don't save on retreat — the user is going back to edit, not
      // moving forward through new data.
      setCurrentStep(STEP_NAMES[nextStep]);
      return nextStep;
    });
  }, [setCurrentStep]);

  // Save draft data after state has committed. When `step` increases (the
  // user advanced), persist the data for the step they left. The effect
  // runs after render, so all setter calls (setUsername, setDateOfBirth,
  // etc.) from the step's onPress have committed to context state by the
  // time we read them.
  const prevStepForSaveRef = useRef(step);
  useEffect(() => {
    if (prevStepForSaveRef.current < step) {
      saveStepDraft(prevStepForSaveRef.current);
    }
    prevStepForSaveRef.current = step;
  }, [step, saveStepDraft]);

  const finish = useCallback(async () => {
    if (!session) return;

    // Lock PIN persists to SecureStore under the signed-in user's namespace.
    // Independent of the profile RPC — done first so the lock challenge state
    // is consistent regardless of how complete_onboarding resolves.
    if (onboarding.lockPin) {
      await lock.setLockPin(onboarding.lockPin);
    } else if (onboarding.lockSkipped) {
      await lock.clearLockPin();
    }

    // Normalize date_of_birth to ISO 8601 at the RPC boundary so Postgres date
    // parsing is independent of the server's DateStyle setting.
    const isoDateOfBirth = mmddyyyyToIso(onboarding.dateOfBirth);
    if (!isoDateOfBirth) {
      Alert.alert('Invalid date of birth. Go back and re-enter it.');
      return;
    }

    // Single-jsonb payload matching the complete_onboarding RPC. Field names
    // mirror the column names in profiles_public/profiles_private exactly —
    // the RPC uses payload->>'<column>' to extract each value.
    const payload = {
      username: onboarding.username,
      date_of_birth: isoDateOfBirth,
      gender_id: onboarding.genderId,
      pronoun_preset: onboarding.pronounPreset,
      pronouns_custom: onboarding.pronounsCustom,
      out_status: onboarding.outStatus,
      accepting_environment: onboarding.acceptingEnvironment,
      identity_tags: onboarding.identities,
    };

    const { error } = await supabase.rpc('complete_onboarding', { payload });

    if (error) {
      // §11.5 errcode map. Codes raised by the RPC, plus 23505 from the
      // unique_violation re-raise path inside the inner exception block.
      switch (error.code) {
        case '23505':
          Alert.alert('Username taken. Pick a different one.');
          setStep(1);
          return;
        case 'P0010':
          Alert.alert('That username is reserved. Try another.');
          setStep(1);
          return;
        case 'P0011':
          Alert.alert('Use 4–15 letters, numbers, ., _, or -. Start and end with a letter or number.');
          setStep(1);
          return;
        case 'P0012':
          Alert.alert('Use 4–15 characters.');
          setStep(1);
          return;
        case '22023':
          Alert.alert("Something's missing. Check your information and try again.");
          return;
        case '28000':
          Alert.alert('Sign in expired. Sign in again.');
          router.replace('/auth/email');
          return;
        default:
          Alert.alert('Something went wrong. Try again.');
          return;
      }
    }

    // 3-attempt refetch — success of the write is committed; we just need
    // the in-memory profile to reflect it before the boot gate routes.
    const result = await refreshProfileWithRetry();
    if (result.kind === 'loaded') {
      router.replace('/onboarding/intro');
    } else {
      Alert.alert('Saved — but having trouble loading. Try opening Haven again in a moment.');
    }
  }, [router, onboarding, lock, session, refreshProfileWithRetry]);

  // Escape hatch: user wants out of onboarding without finishing. Sign-out
  // invalidates the local session; AuthProvider's session=null cascade then
  // unloads profileState. Scope 'local' only — we don't revoke other devices'
  // tokens here.
  //
  // We then explicitly route to '/'. The boot gate lives in app/index.tsx
  // and isn't mounted while the user is on /onboarding (router.replace
  // unmounted it on the way in), so it can't react to the session change on
  // its own. Replacing to '/' remounts the boot gate with a fresh
  // bootResolved=false — it sees no session and renders the welcome UI.
  // On a failed sign-out the navigation still fires; the boot gate sees the
  // still-valid session and routes right back to /onboarding, so the user
  // is no worse off than before.
  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.warn('[onboarding] sign-out failed:', e);
    }
    router.replace('/');
  }, [router]);

  const handleBack = useCallback(() => {
    if (backOverride) {
      backOverride();
      return;
    }
    if (step === 1) {
      // Back on step 1 used to exit to welcome; that path let users escape
      // onboarding with partial profile data. The only sanctioned exits from
      // /onboarding now are (a) completing the flow via complete_onboarding
      // and (b) tapping the sign-out link rendered below.
      Alert.alert(
        'Almost done!',
        'Finish setting up your profile to continue. If you want to use a different account, tap "Sign out" below.',
        [{ text: 'OK' }],
      );
      return;
    }
    retreat();
  }, [backOverride, step, retreat]);

  const flowValue = useMemo<StepFlowValue>(
    () => ({
      setPrimaryButton: setPrimary,
      setSecondaryButton: setSecondary,
      setBackHandler: (h) => setBackOverride(() => h),
      advance,
      retreat,
      finish,
    }),
    [advance, retreat, finish],
  );

  const currStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: currTX.value }],
    opacity: currOpacity.value,
  }));
  const prevStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: prevTX.value }],
    opacity: prevOpacity.value,
  }));

  const onBodyLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== bodyWidth) setBodyWidth(w);
  };

  return (
    <StepFlowContext.Provider value={flowValue}>
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: colors.backgroundPrimary }]}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
        <OnboardingHeader step={step} total={TOTAL_STEPS} onBack={handleBack} />

        <View style={styles.bodyHost} onLayout={onBodyLayout}>
          {prevStep !== null ? (
            <Animated.View style={[styles.bodyLayer, styles.bodyLayerAbsolute, prevStyle]} pointerEvents="none">
              {renderStep(prevStep, { isActive: false })}
            </Animated.View>
          ) : null}
          <Animated.View style={[styles.bodyLayer, currStyle]}>
            {renderStep(step, { isActive: prevStep === null || prevStep !== step })}
          </Animated.View>
        </View>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, Spacing.md),
              borderTopColor: colors.gray100,
            },
          ]}
        >
          <PrimaryNextButton
            label={primary.label}
            inactive={primary.inactive}
            onPress={primary.onPress}
          />
          {secondary ? (
            <Pressable onPress={secondary.onPress} style={styles.secondary} accessibilityRole="button">
              <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>{secondary.label}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleSignOut}
            style={styles.signOutLink}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            hitSlop={8}
          >
            <Text style={[styles.signOutText, { color: colors.textPrimary }]}>
              Sign out
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </StepFlowContext.Provider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  bodyHost: { flex: 1, overflow: 'hidden' },
  bodyLayer: { flex: 1 },
  bodyLayerAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray100,
  },
  secondary: { alignItems: 'center', paddingVertical: Spacing.sm },
  secondaryText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md, color: Colors.black },
  signOutLink: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  signOutText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
