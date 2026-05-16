import { usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiagonalWipe } from '@/components/lock/diagonal-wipe';
import { LockSuccessSequence } from '@/components/lock/lock-success-sequence';
import { PinPad } from '@/components/ui/pin-pad';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useLock, type UnlockResult } from '@/contexts/lock-context';

const TOAST_MS = 2400;
const WRONG_HOLD_MS = 700;

export function LockOverlay() {
  const { isLocked, lockedUntil, tryUnlock, markUnlocked } = useLock();
  const insets = useSafeAreaInsets();
  // Suppress the overlay on pre-signed-in routes (welcome at `/` and the
  // onboarding flow). Without this, stale lockPin data from a prior account
  // would slam the lock screen over the welcome view on cold launch.
  const pathname = usePathname();
  const onAuthFlow = pathname === '/' || pathname.startsWith('/onboarding');

  const [pin, setPin] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successPhase, setSuccessPhase] = useState<'idle' | 'running'>('idle');
  const [wipePlay, setWipePlay] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fillProgress = useSharedValue(0);
  const errorOpacity = useSharedValue(0);
  // Driven by LockSuccessSequence — fades the title / Forgot link / dot+key
  // area together so the foreground exits in lockstep before the wipe starts.
  const foregroundOpacity = useSharedValue(1);
  // Wrong-PIN shake offset applied to the PinPad dot row.
  const dotsShakeX = useSharedValue(0);

  // Toggle blue/purple on each digit — 0/2/4 digits = blue, 1/3 = purple.
  useEffect(() => {
    fillProgress.value = pin.length % 2;
  }, [pin.length, fillProgress]);

  // Reset all state whenever the overlay becomes visible after being hidden.
  useEffect(() => {
    if (!isLocked) return;
    setPin('');
    setToast(null);
    setSubmitting(false);
    setSuccessPhase('idle');
    setWipePlay(false);
    fillProgress.value = 0;
    errorOpacity.value = 0;
    foregroundOpacity.value = 1;
    dotsShakeX.value = 0;
  }, [isLocked, fillProgress, errorOpacity, foregroundOpacity, dotsShakeX]);

  const clearPinAfterWrong = useCallback(() => {
    setPin('');
    setSubmitting(false);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const handleResult = useCallback(
    (result: UnlockResult) => {
      if (result.kind === 'correct') {
        // Hand off to LockSuccessSequence — it drives the converge → checkmark
        // → fade timeline and signals back via onFadeComplete to start the
        // diagonal wipe. markUnlocked fires only after the wipe completes so
        // the overlay doesn't unmount mid-animation.
        setSuccessPhase('running');
        return;
      }
      if (result.kind === 'locked-out') {
        // The lockedUntil effect handles the red tint; just toast and clear.
        showToast('Too many attempts');
        setPin('');
        setSubmitting(false);
        return;
      }
      // Wrong PIN: flash red, shake the dots, toast, then fade back to blue
      // and clear input.
      errorOpacity.value = withTiming(1, { duration: 220 }, () => {
        errorOpacity.value = withDelay(
          WRONG_HOLD_MS,
          withTiming(0, { duration: 320 }, (finished) => {
            if (finished) runOnJS(clearPinAfterWrong)();
          }),
        );
      });
      // 5 keyframes × 50ms = 250ms total. Decaying amplitude reads as a real
      // shake instead of a constant-amplitude wobble.
      dotsShakeX.value = withSequence(
        withTiming(-10, { duration: 50, easing: Easing.linear }),
        withTiming(10, { duration: 50, easing: Easing.linear }),
        withTiming(-7, { duration: 50, easing: Easing.linear }),
        withTiming(7, { duration: 50, easing: Easing.linear }),
        withTiming(0, { duration: 50, easing: Easing.linear }),
      );
      showToast('Wrong code. Try again.');
    },
    [errorOpacity, dotsShakeX, showToast, clearPinAfterWrong],
  );

  // Auto-submit when the 4th digit lands.
  useEffect(() => {
    if (pin.length !== 4) return;
    if (submitting) return;
    setSubmitting(true);
    void (async () => {
      const result = await tryUnlock(pin);
      handleResult(result);
    })();
  }, [pin, submitting, tryUnlock, handleResult]);

  // Countdown ticker for the lockout state.
  useEffect(() => {
    if (lockedUntil == null) {
      setCountdown(null);
      return;
    }
    const tick = () => {
      const ms = lockedUntil - Date.now();
      setCountdown(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [lockedUntil]);

  // Drive the red tint from lockout state — covers entry from any path
  // (fresh lockout, cold launch into a still-active lockout, and timer expiry).
  useEffect(() => {
    if (lockedUntil != null) {
      errorOpacity.value = withTiming(1, { duration: 240 });
    } else {
      errorOpacity.value = withTiming(0, { duration: 280 });
      setPin('');
      setSubmitting(false);
    }
  }, [lockedUntil, errorOpacity]);

  const baseStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      fillProgress.value,
      [0, 1],
      [Colors.blue, Colors.purple],
    ),
  }));
  const foregroundStyle = useAnimatedStyle(() => ({ opacity: foregroundOpacity.value }));
  const errorStyle = useAnimatedStyle(() => ({ opacity: errorOpacity.value }));

  const handleForgot = useCallback(() => {
    showToast('Coming soon');
  }, [showToast]);

  if (!isLocked || onAuthFlow) return null;

  const lockedOut = lockedUntil != null && countdown != null && countdown > 0;
  const countdownLabel = lockedOut
    ? `Try again in 0:${String(countdown).padStart(2, '0')}`
    : null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      {/* Base color layer — unmounts when the wipe starts so the slabs (which
          are also blue) become the only blue on screen. Otherwise the gap
          between the sliding slabs would just reveal more blue. */}
      {!wipePlay ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, baseStyle]} />
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: Colors.cherry }, errorStyle]}
      />

      {toast ? (
        <Animated.View
          entering={FadeInDown.duration(280).springify().damping(18)}
          exiting={FadeOutUp.duration(220)}
          style={[styles.toast, { top: insets.top + Spacing.sm }]}
          pointerEvents="none"
        >
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      ) : null}

      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xl + 40,
            paddingBottom: insets.bottom + Spacing.xl,
          },
          foregroundStyle,
        ]}
      >
        <Text style={styles.title}>Enter code</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Forgot your code? Reset your code"
          onPress={handleForgot}
          style={styles.forgotWrap}
          disabled={lockedOut || successPhase === 'running'}
        >
          <Text style={styles.forgotText}>
            Forgot your code?{' '}
            <Text style={styles.forgotLink}>Reset your code</Text>
          </Text>
        </Pressable>

        {lockedOut ? (
          <View style={styles.lockoutWrap}>
            <Text style={styles.lockoutText}>{countdownLabel}</Text>
          </View>
        ) : successPhase === 'running' ? (
          <LockSuccessSequence
            foregroundOpacity={foregroundOpacity}
            onFadeComplete={() => setWipePlay(true)}
          />
        ) : (
          <PinPad
            pin={pin}
            onPinChange={setPin}
            dotFilledColor={Colors.white}
            dotEmptyBorderColor={Colors.white}
            keyTextColor={Colors.white}
            keyPressedBg="rgba(255,255,255,0.18)"
            disabled={submitting}
            centerDots
            dotsTranslateX={dotsShakeX}
          />
        )}
      </Animated.View>

      {wipePlay ? <DiagonalWipe play onComplete={markUnlocked} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    // No zIndex — natural sibling order in _layout.tsx puts this above the
    // navigator and below the splash overlay (which is rendered after it).
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h1,
    lineHeight: 44,
    letterSpacing: -2.4,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  forgotWrap: {
    marginBottom: Spacing.xl,
    alignSelf: 'flex-start',
  },
  forgotText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.white,
    opacity: 0.85,
  },
  forgotLink: {
    textDecorationLine: 'underline',
    fontFamily: FontFamily.semiBold,
  },
  lockoutWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockoutText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.white,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    zIndex: 100,
  },
  toastText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
});
