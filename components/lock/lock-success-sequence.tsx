import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Colors, Spacing } from '@/constants/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const DOT_SIZE = 18;
const MERGED_SIZE = 56;
// Center-to-center offsets for the 4 PinPad dots (18px wide, 20px gap → row
// width 132). Mirrors the original layout so the sequence's dots start exactly
// where the user's 4 dots just were.
const DOT_OFFSETS = [-57, -19, 19, 57] as const;
const CHECK_DASH = 60;

// Keypad slot — 4 rows × 68px + 3 × 4px gap + 16px bottom padding. Mirrors
// PinPad's padStatic so swapping PinPad → sequence doesn't reflow the layout
// and the dot row stays at the same Y position.
const KEYPAD_SLOT_HEIGHT = 4 * 68 + 3 * Spacing.xs + Spacing.md;

const CONVERGE_MS = 260;
const MORPH_DELAY = 220;
const MORPH_MS = 320;
const FADE_DELAY = 540;
const FADE_MS = 180;

type Props = {
  // Owned by the parent so it can fade the title / Forgot link in lockstep
  // with this component's own fade.
  foregroundOpacity: SharedValue<number>;
  // Called once the foreground fade completes — parent triggers the diagonal
  // wipe at that moment.
  onFadeComplete: () => void;
};

export function LockSuccessSequence({ foregroundOpacity, onFadeComplete }: Props) {
  const converge = useSharedValue(0);
  const morph = useSharedValue(0);

  useEffect(() => {
    converge.value = withTiming(1, {
      duration: CONVERGE_MS,
      easing: Easing.out(Easing.cubic),
    });
    morph.value = withDelay(
      MORPH_DELAY,
      withTiming(1, { duration: MORPH_MS, easing: Easing.out(Easing.cubic) }),
    );
    foregroundOpacity.value = withDelay(
      FADE_DELAY,
      withTiming(0, { duration: FADE_MS, easing: Easing.linear }),
    );
    const fadeTimer = setTimeout(onFadeComplete, FADE_DELAY + FADE_MS);
    return () => clearTimeout(fadeTimer);
  }, [converge, morph, foregroundOpacity, onFadeComplete]);

  return (
    <>
      <View style={styles.dotRow}>
        {DOT_OFFSETS.map((offset, i) => (
          <ConvergingDot key={i} offset={offset} converge={converge} morph={morph} />
        ))}
        <MergedCircle morph={morph} />
      </View>
      <View style={styles.keypadSlot} />
    </>
  );
}

function ConvergingDot({
  offset,
  converge,
  morph,
}: {
  offset: number;
  converge: SharedValue<number>;
  morph: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const tx = interpolate(converge.value, [0, 1], [offset, 0]);
    const opacity = interpolate(morph.value, [0, 0.4], [1, 0], 'clamp');
    return {
      transform: [{ translateX: tx }],
      opacity,
    };
  });
  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

function MergedCircle({ morph }: { morph: SharedValue<number> }) {
  const circleStyle = useAnimatedStyle(() => {
    const scale = interpolate(morph.value, [0, 1], [DOT_SIZE / MERGED_SIZE, 1]);
    const opacity = interpolate(morph.value, [0, 0.25, 1], [0, 1, 1]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Sweep strokeDashoffset from CHECK_DASH → 0 across the back 60% of the
  // morph window so the checkmark draws in after the circle has scaled up.
  const pathProps = useAnimatedProps(() => {
    const t = interpolate(morph.value, [0.4, 1], [0, 1], 'clamp');
    return { strokeDashoffset: interpolate(t, [0, 1], [CHECK_DASH, 0]) } as {
      strokeDashoffset: number;
    };
  });

  return (
    <Animated.View style={[styles.mergedCircle, circleStyle]}>
      <Svg width={MERGED_SIZE} height={MERGED_SIZE} viewBox="0 0 56 56">
        <AnimatedPath
          d="M16 29 L25 38 L42 18"
          stroke={Colors.blue}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={CHECK_DASH}
          animatedProps={pathProps}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dotRow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Colors.white,
  },
  mergedCircle: {
    position: 'absolute',
    width: MERGED_SIZE,
    height: MERGED_SIZE,
    borderRadius: MERGED_SIZE / 2,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadSlot: {
    height: KEYPAD_SLOT_HEIGHT,
  },
});
