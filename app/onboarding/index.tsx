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
import { useAuth } from '@/contexts/auth-context';
import { useCurrentUser } from '@/contexts/current-user-context';
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
import { hasSeenIntro } from '@/lib/intro-storage';
import { setProfile } from '@/lib/profile-storage';
import { supabase } from '@/lib/supabase';

const TOTAL_STEPS = 7;

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
  const { refresh: refreshCurrentUser } = useCurrentUser();
  const { session, refreshProfile } = useAuth();
  const lock = useLock();

  const [step, setStep] = useState(1);
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

  const advance = useCallback(() => {
    setStep((s) => {
      if (s >= TOTAL_STEPS) return s;
      directionRef.current = 'forward';
      setPrevStep(s);
      return s + 1;
    });
  }, []);

  const retreat = useCallback(() => {
    setStep((s) => {
      if (s <= 1) return s;
      directionRef.current = 'backward';
      setPrevStep(s);
      return s - 1;
    });
  }, []);

  const finish = useCallback(async () => {
    await setProfile({
      username: onboarding.username,
      dateOfBirth: onboarding.dateOfBirth,
      genderId: onboarding.genderId,
      pronounPreset: onboarding.pronounPreset,
      pronounsCustom: onboarding.pronounsCustom,
      outStatus: onboarding.outStatus,
      acceptingEnvironment: onboarding.acceptingEnvironment,
      identities: onboarding.identities,
    });
    // Sync CurrentUserProvider with the just-written profile so chat-selection
    // highlights real identity tags instead of the empty-profile fallback.
    await refreshCurrentUser();
    // Write the PIN under the signed-in user's namespace. setLockPin also
    // marks the session as just-unlocked, so the lock overlay won't trigger
    // immediately after onboarding finishes. Sign-out → sign-in will
    // re-challenge as expected.
    if (session) {
      if (onboarding.lockPin) {
        await lock.setLockPin(onboarding.lockPin);
      } else if (onboarding.lockSkipped) {
        await lock.clearLockPin();
      }
    }

    // Persist username to Supabase so the boot gate in app/index.tsx knows the
    // profile is complete on next launch. The full profile (pronouns, gender,
    // identities, bio, etc.) syncs to Supabase in Phase B.
    if (session) {
      const { error } = await supabase
        .from('profiles')
        .update({ username: onboarding.username })
        .eq('id', session.user.id);
      if (error) {
        if (error.code === '23505') {
          Alert.alert('Username taken', 'Pick a different one and try again.');
        } else {
          Alert.alert('Could not save profile', error.message);
        }
        return;
      }
      await refreshProfile();
    }

    const seen = await hasSeenIntro();
    if (seen) {
      router.replace('/(tabs)/chat-selection');
    } else {
      router.replace('/onboarding/intro');
    }
  }, [router, onboarding, refreshCurrentUser, lock, session, refreshProfile]);

  const handleBack = useCallback(() => {
    if (backOverride) {
      backOverride();
      return;
    }
    if (step === 1) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
      return;
    }
    retreat();
  }, [backOverride, step, retreat, router]);

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
});
