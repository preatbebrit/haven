import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PinPad } from '@/components/ui/pin-pad';
import { useStepFlow } from '@/contexts/step-flow-context';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Phase = 'entry' | 'success';

export function StepLock({ isActive }: { isActive: boolean }) {
  const { colors } = useTheme();
  const { setPrimaryButton, setSecondaryButton, setBackHandler, advance } = useStepFlow();
  const { setLockPin, setLockSkipped } = useOnboarding();
  const [phase, setPhase] = useState<Phase>('entry');
  const [pin, setPin] = useState('');

  const full = pin.length === 4;

  useEffect(() => {
    if (!isActive) return;

    if (phase === 'success') {
      setPrimaryButton({
        label: 'Got it',
        inactive: false,
        onPress: () => advance(),
      });
      setSecondaryButton(null);
      setBackHandler(() => setPhase('entry'));
      return;
    }

    setPrimaryButton({
      label: 'Set Lock Code',
      inactive: !full,
      onPress: () => {
        if (!full) return;
        setLockPin(pin);
        setLockSkipped(false);
        setPhase('success');
      },
    });
    setSecondaryButton({
      label: 'Skip',
      onPress: () => {
        setLockPin(null);
        setLockSkipped(true);
        advance();
      },
    });
    setBackHandler(null);
  }, [isActive, phase, full, pin, setLockPin, setLockSkipped, advance, setPrimaryButton, setSecondaryButton, setBackHandler]);

  if (phase === 'success') {
    return (
      <View style={styles.successScreen}>
        <SuccessBody
          titleColor={colors.textPrimary}
          subColor={colors.textSecondary}
        />
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Add a lock screen?</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Your privacy is very important. A short PIN helps keep your chats and profile safe if
        someone picks up your phone.
      </Text>

      <PinPad
        pin={pin}
        onPinChange={setPin}
        dotFilledColor={colors.textPrimary}
        dotEmptyBorderColor={Colors.gray60}
        keyTextColor={colors.textPrimary}
        keyPressedBg={colors.gray100}
      />
    </View>
  );
}

function SuccessBody({ titleColor, subColor }: { titleColor: string; subColor: string }) {
  const lockScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    lockScale.value = withSpring(1, { damping: 8, stiffness: 180, mass: 0.7 });
    textOpacity.value = withDelay(180, withTiming(1, { duration: 320 }));
  }, [lockScale, textOpacity]);

  const lockStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lockScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));

  return (
    <View style={styles.successBody}>
      <Animated.Text style={[styles.lockEmoji, lockStyle]}>🔒</Animated.Text>
      <Animated.Text style={[styles.successTitle, { color: titleColor }, textStyle]}>
        Lock screen set!
      </Animated.Text>
      <Animated.Text style={[styles.successSub, { color: subColor }, textStyle]}>
        You can always turn this off from your settings.
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  successScreen: { flex: 1 },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h1,
    lineHeight: 44,
    letterSpacing: -2.4,
    color: Colors.black,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.gray40,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  successBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  lockEmoji: { fontSize: 72, marginBottom: Spacing.lg },
  successTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h1,
    lineHeight: 44,
    letterSpacing: -2.4,
    color: Colors.black,
    marginBottom: Spacing.sm,
  },
  successSub: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.gray40,
    textAlign: 'center',
    lineHeight: 24,
  },
});
