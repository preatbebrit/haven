import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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

import { GlowUnderline } from '@/components/onboarding/glow-underline';
import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useActiveChat } from '@/contexts/active-chat-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { SUPABASE_CONFIGURED, supabase } from '@/lib/supabase';

type Mode = 'sign-in' | 'sign-up';
type Step = 'email' | 'password';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

// Match the onboarding step animation (app/onboarding/index.tsx).
const TRANSITION_MS = 280;
const OUTGOING_OFFSET = 32;

export default function AuthEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { session, profileOnboardingCompleted } = useAuth();
  const { activeChatId } = useActiveChat();

  const [mode, setMode] = useState<Mode>('sign-up');
  const [step, setStep] = useState<Step>('email');
  const [prevStep, setPrevStep] = useState<Step | null>(null);
  const directionRef = useRef<'forward' | 'backward'>('forward');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // True from "auth succeeded" until we router.replace away. Keeps the overlay
  // spinner on screen while AuthProvider finishes loading the profile, so
  // the user doesn't see a white flash or a wrong-route flicker.
  const [awaitingRoute, setAwaitingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touchedConfirm, setTouchedConfirm] = useState(false);

  const [bodyWidth, setBodyWidth] = useState(0);
  const currTX = useSharedValue(0);
  const currOpacity = useSharedValue(1);
  const prevTX = useSharedValue(0);
  const prevOpacity = useSharedValue(1);

  const trimmedEmail = email.trim();
  const emailValid = EMAIL_RE.test(trimmedEmail);
  const passwordValid = password.length >= MIN_PASSWORD;
  const confirmMatches = confirm === password;

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

  // After signIn/signUp succeeds we set awaitingRoute=true and stay mounted
  // until AuthProvider's loadProfile resolves. Then we route directly to the
  // final destination — skipping the welcome-screen bounce that caused the
  // white-flash / wrong-route-flicker bug.
  useEffect(() => {
    if (!awaitingRoute) return;
    if (!session) return;
    if (profileOnboardingCompleted === undefined) return;
    if (!profileOnboardingCompleted) {
      router.replace('/onboarding');
      return;
    }
    if (activeChatId) {
      router.replace('/chat');
      return;
    }
    router.replace('/(tabs)/chat-selection');
  }, [awaitingRoute, session, profileOnboardingCompleted, activeChatId, router]);

  function advanceTo(next: Step) {
    directionRef.current = 'forward';
    setPrevStep(step);
    setStep(next);
    setError(null);
  }

  function retreatTo(prev: Step) {
    directionRef.current = 'backward';
    setPrevStep(step);
    setStep(prev);
    setError(null);
  }

  function handleEmailNext() {
    if (!emailValid || submitting) return;
    advanceTo('password');
  }

  function handlePasswordNext() {
    if (submitting) return;
    if (mode === 'sign-up') {
      if (!passwordValid || !confirmMatches) {
        setTouchedConfirm(true);
        return;
      }
      void handleSignUp();
      return;
    }
    if (!passwordValid) return;
    void handleSignIn();
  }

  async function handleSignIn() {
    if (!SUPABASE_CONFIGURED) {
      setError(
        'Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env and restart Expo.',
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (authError) {
        setError(authError.message);
        setSubmitting(false);
        return;
      }
      // Stay on this screen with the overlay spinner; the watch effect will
      // route once AuthProvider finishes loading the profile.
      setAwaitingRoute(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      setSubmitting(false);
    }
  }

  async function handleSignUp() {
    if (!SUPABASE_CONFIGURED) {
      setError(
        'Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env and restart Expo.',
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });
      if (authError) {
        // "User already registered" → bounce back to step 1 and flip to sign-in
        // so the user can enter their existing password.
        if (/already\s*registered/i.test(authError.message)) {
          setMode('sign-in');
          setPassword('');
          setConfirm('');
          setTouchedConfirm(false);
          directionRef.current = 'backward';
          setPrevStep(step);
          setStep('email');
          setError('That email already has an account. Sign in instead.');
          setSubmitting(false);
          return;
        }
        setError(authError.message);
        setSubmitting(false);
        return;
      }
      // Stay on this screen with the overlay spinner; the watch effect will
      // route once AuthProvider finishes loading the profile.
      setAwaitingRoute(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (submitting || awaitingRoute) return;
    if (step === 'password') {
      retreatTo('email');
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  function toggleMode() {
    if (submitting || awaitingRoute) return;
    setMode((m) => (m === 'sign-up' ? 'sign-in' : 'sign-up'));
    setPassword('');
    setConfirm('');
    setTouchedConfirm(false);
    setError(null);
    if (step !== 'email') {
      directionRef.current = 'backward';
      setPrevStep(step);
      setStep('email');
    }
  }

  const currStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: currTX.value }],
    opacity: currOpacity.value,
  }));
  const prevStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: prevTX.value }],
    opacity: prevOpacity.value,
  }));

  function onBodyLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w !== bodyWidth) setBodyWidth(w);
  }

  const primaryLabel = (() => {
    if (submitting) return mode === 'sign-up' ? 'Creating…' : 'Signing in…';
    if (step === 'password') return mode === 'sign-up' ? 'Create account' : 'Sign in';
    return 'Next';
  })();

  const primaryInactive = (() => {
    if (submitting || awaitingRoute) return true;
    if (step === 'email') return !emailValid;
    if (mode === 'sign-up') return !passwordValid || !confirmMatches;
    return !passwordValid;
  })();

  const onPrimary = () => {
    if (step === 'email') return handleEmailNext();
    return handlePasswordNext();
  };

  const toggleLabel =
    mode === 'sign-up' ? 'Already have an account? Sign in' : "Don't have an account? Sign up";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: colors.backgroundPrimary }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <PressableScale
            style={[styles.back, { backgroundColor: colors.buttonPrimary }]}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimaryInverted} />
          </PressableScale>
        </View>

        <View style={styles.bodyHost} onLayout={onBodyLayout}>
          {prevStep !== null ? (
            <Animated.View
              style={[styles.bodyLayer, styles.bodyLayerAbsolute, prevStyle]}
              pointerEvents="none"
            >
              {renderStep(prevStep, {
                mode,
                email,
                password,
                confirm,
                touchedConfirm,
                confirmMatches,
                colors,
                setEmail: () => {},
                setPassword: () => {},
                setConfirm: () => {},
                setTouchedConfirm: () => {},
                onSubmitEditing: () => {},
              })}
            </Animated.View>
          ) : null}
          <Animated.View style={[styles.bodyLayer, currStyle]} pointerEvents={awaitingRoute ? 'none' : 'auto'}>
            {renderStep(step, {
              mode,
              email,
              password,
              confirm,
              touchedConfirm,
              confirmMatches,
              colors,
              setEmail: (t) => {
                setEmail(t);
                if (error) setError(null);
              },
              setPassword: (t) => {
                setPassword(t);
                if (error) setError(null);
              },
              setConfirm: (t) => {
                setConfirm(t);
                if (error) setError(null);
              },
              setTouchedConfirm,
              onSubmitEditing: onPrimary,
            })}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </Animated.View>

          {awaitingRoute ? (
            <View style={styles.loadingOverlay} pointerEvents="auto">
              <ActivityIndicator size="large" color={colors.textPrimary} />
            </View>
          ) : null}
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <PrimaryNextButton label={primaryLabel} inactive={primaryInactive} onPress={onPrimary} />
          <Pressable
            onPress={toggleMode}
            disabled={submitting || awaitingRoute}
            style={styles.toggleBtn}
            accessibilityRole="button"
          >
            <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{toggleLabel}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

type StepProps = {
  mode: Mode;
  email: string;
  password: string;
  confirm: string;
  touchedConfirm: boolean;
  confirmMatches: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  setEmail: (t: string) => void;
  setPassword: (t: string) => void;
  setConfirm: (t: string) => void;
  setTouchedConfirm: (b: boolean) => void;
  onSubmitEditing: () => void;
};

function renderStep(step: Step, p: StepProps) {
  if (step === 'email') {
    return (
      <View style={styles.body}>
        <Text style={[styles.title, { color: p.colors.textPrimary }]}>
          {'What is your email\naddress?'}
        </Text>
        <GlowUnderline style={styles.inputWrap}>
          <TextInput
            style={[styles.bigInput, { color: p.colors.textPrimary }]}
            value={p.email}
            onChangeText={p.setEmail}
            placeholder="example@haven.com"
            placeholderTextColor={p.colors.gray80}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={p.onSubmitEditing}
            autoFocus
            accessibilityLabel="Email address"
          />
        </GlowUnderline>
      </View>
    );
  }

  // password (+ confirm for sign-up)
  const isSignUp = p.mode === 'sign-up';
  const showConfirmError =
    isSignUp && p.touchedConfirm && p.confirm.length > 0 && !p.confirmMatches;

  return (
    <View style={styles.body}>
      <Text style={[styles.title, { color: p.colors.textPrimary }]}>
        {isSignUp ? 'Create a password' : 'Enter your password'}
      </Text>

      <GlowUnderline style={styles.inputWrap}>
        <TextInput
          style={[styles.bigInput, { color: p.colors.textPrimary }]}
          value={p.password}
          onChangeText={p.setPassword}
          placeholder="Password"
          placeholderTextColor={p.colors.gray80}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          textContentType={isSignUp ? 'newPassword' : 'password'}
          returnKeyType={isSignUp ? 'next' : 'done'}
          onSubmitEditing={isSignUp ? undefined : p.onSubmitEditing}
          autoFocus
          accessibilityLabel="Password"
        />
      </GlowUnderline>

      {isSignUp ? (
        <>
          <Text style={[styles.confirmLabel, { color: p.colors.textPrimary }]}>
            Confirm password
          </Text>
          <GlowUnderline variant={showConfirmError ? 'error' : 'default'} style={styles.confirmWrap}>
            <TextInput
              style={[styles.bigInput, { color: p.colors.textPrimary }]}
              value={p.confirm}
              onChangeText={(t) => {
                p.setConfirm(t);
                p.setTouchedConfirm(true);
              }}
              placeholder="Password"
              placeholderTextColor={p.colors.gray80}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={p.onSubmitEditing}
              accessibilityLabel="Confirm password"
            />
          </GlowUnderline>
          {showConfirmError ? (
            <Text style={styles.error}>Passwords don&apos;t match</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  back: {
    width: 48,
    height: 48,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyHost: { flex: 1, overflow: 'hidden' },
  bodyLayer: { flex: 1 },
  bodyLayerAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h1,
    lineHeight: 44,
    letterSpacing: -2.4,
    marginBottom: Spacing.sm,
  },
  inputWrap: { marginTop: Spacing.lg },
  confirmLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: 20,
    letterSpacing: -0.32,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  confirmWrap: { marginTop: Spacing.sm },
  bigInput: {
    fontFamily: FontFamily.semiBold,
    fontSize: 32,
    letterSpacing: -0.64,
    paddingVertical: Spacing.sm,
  },
  error: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.lg,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.cherry,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  toggleBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  toggleLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});
