import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  step: number;
  total?: number;
  onBack?: () => void;
};

const PROGRESS_ANIM_MS = 400;

export function OnboardingHeader({ step, total = 7, onBack }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const progress = useRef(new Animated.Value(step / total)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: step / total,
      duration: PROGRESS_ANIM_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, step, total]);

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + Spacing.sm, backgroundColor: colors.backgroundPrimary },
      ]}
    >
      <View style={styles.row}>
        <PressableScale
          style={[styles.back, { backgroundColor: colors.buttonPrimary }]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimaryInverted} />
        </PressableScale>

        <View style={[styles.progressTrack, { backgroundColor: colors.gray100 }]}>
          <Animated.View
            style={[styles.progressFill, { width: fillWidth, backgroundColor: colors.textPrimary }]}
          />
        </View>

        <View style={[styles.stepBadge, { borderColor: colors.gray100 }]}>
          <Text style={[styles.stepText, { color: colors.textSecondary }]}>
            {step}/{total}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  back: {
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.gray100,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.black,
    borderRadius: 2,
  },
  stepBadge: {
    width: 48,
    height: 48,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    letterSpacing: -0.32,
    color: Colors.gray40,
  },
});
