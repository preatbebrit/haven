import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors, FontFamily } from '@/constants/theme';

const LETTERS = ['h', '@', 'v', 'e', 'n'] as const;
const STAGGER = 70;
const LIFT_MS = 180;
const AMPLITUDE = 10;
/** Negative left margin between letters as a fraction of fontSize. */
const LETTER_OVERLAP = 0.08;

type Props = {
  /** Logo height in pt; the text is sized to roughly match. */
  size?: number;
  color?: string;
};

export function AnimatedHavenLogo({ size = 96, color = Colors.black }: Props) {
  return (
    <View style={styles.row}>
      {LETTERS.map((ch, i) => (
        <Letter
          key={i}
          char={ch}
          delay={i * STAGGER}
          fontSize={size}
          color={color}
          isFirst={i === 0}
        />
      ))}
    </View>
  );
}

function Letter({
  char,
  delay,
  fontSize,
  color,
  isFirst,
}: {
  char: string;
  delay: number;
  fontSize: number;
  color: string;
  isFirst: boolean;
}) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withDelay(
      delay,
      withSequence(
        withTiming(-AMPLITUDE, { duration: LIFT_MS, easing: Easing.out(Easing.cubic) }),
        // Snap back into place — softer spring, minimal overshoot.
        withSpring(0, { damping: 12, stiffness: 240, mass: 0.55 }),
      ),
    );
  }, [delay, offset]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.Text
      style={[
        styles.letter,
        {
          fontSize,
          lineHeight: fontSize,
          color,
          marginLeft: isFirst ? 0 : -fontSize * LETTER_OVERLAP,
        },
        animStyle,
      ]}
    >
      {char}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  letter: {
    fontFamily: FontFamily.extraBold,
    letterSpacing: -2,
    includeFontPadding: false,
  },
});
