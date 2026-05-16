import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label?: string;
  inactive?: boolean;
  onPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_SCALE = 0.97;
const PRESS_IN_DURATION = 80;
const PRESS_OUT_DURATION = 220;
// Slight back-out so the release has a tiny tactile pop instead of a flat ramp.
const PRESS_OUT_EASING = Easing.bezier(0.34, 1.2, 0.64, 1);

export function PrimaryNextButton({ label = 'Next', inactive, onPress }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    if (inactive) return;
    scale.value = withTiming(PRESS_SCALE, {
      duration: PRESS_IN_DURATION,
      easing: Easing.out(Easing.quad),
    });
  }

  function handlePressOut() {
    if (inactive) return;
    scale.value = withTiming(1, {
      duration: PRESS_OUT_DURATION,
      easing: PRESS_OUT_EASING,
    });
  }

  return (
    <AnimatedPressable
      style={[
        styles.btn,
        { backgroundColor: colors.buttonPrimary },
        inactive && { backgroundColor: colors.gray80 },
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive }}
    >
      <View style={styles.iconSlot} />
      <Text
        style={[
          styles.label,
          { color: colors.textPrimaryInverted },
          inactive && styles.labelInactive,
        ]}
      >
        {label}
      </Text>
      <View style={styles.iconSlot}>
        <Ionicons name="arrow-forward" size={20} color={colors.textPrimaryInverted} />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: Colors.black,
    borderRadius: Radius.lg,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg - 4, // 20px per Figma
    paddingVertical: 10,
  },
  btnInactive: {
    backgroundColor: Colors.gray80,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.32,
    color: Colors.white,
  },
  labelInactive: {
    fontFamily: FontFamily.semiBold,
  },
  iconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
