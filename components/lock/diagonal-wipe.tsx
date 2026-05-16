import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

type Props = {
  // Mount in idle (progress=0). Flipping `play` to true starts the wipe.
  play: boolean;
  durationMs?: number;
  onComplete?: () => void;
};

const WIPE_DURATION_MS = 460;
// The slabs start with a nearly horizontal seam and progressively skew to a
// stronger diagonal as the wipe opens. Both slabs share the same skew at all
// times so the seam between them stays aligned.
const SKEW_START_DEG = 0;
const SKEW_END_DEG = -14;
const OVERSHOOT = 40;

export function DiagonalWipe({ play, durationMs = WIPE_DURATION_MS, onComplete }: Props) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!play) return;
    progress.value = withTiming(
      1,
      { duration: durationMs, easing: Easing.in(Easing.cubic) },
      (finished) => {
        'worklet';
        if (finished && onComplete) runOnJS(onComplete)();
      },
    );
  }, [play, durationMs, onComplete, progress]);

  const topSlabStyle = useAnimatedStyle(() => {
    const skew = interpolate(progress.value, [0, 1], [SKEW_START_DEG, SKEW_END_DEG]);
    const ty = interpolate(progress.value, [0, 1], [0, -(height * 1.15)]);
    const tx = interpolate(progress.value, [0, 1], [0, width * 0.15]);
    return {
      transform: [{ skewY: `${skew}deg` }, { translateY: ty }, { translateX: tx }],
    };
  });

  const bottomSlabStyle = useAnimatedStyle(() => {
    const skew = interpolate(progress.value, [0, 1], [SKEW_START_DEG, SKEW_END_DEG]);
    const ty = interpolate(progress.value, [0, 1], [0, height * 1.15]);
    const tx = interpolate(progress.value, [0, 1], [0, -(width * 0.15)]);
    return {
      transform: [{ skewY: `${skew}deg` }, { translateY: ty }, { translateX: tx }],
    };
  });

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.slabTop, topSlabStyle]} />
      <Animated.View pointerEvents="none" style={[styles.slabBottom, bottomSlabStyle]} />
    </>
  );
}

// Each slab is oversized horizontally and vertically so the skewed corners
// always sit outside the screen bounds — otherwise the underlying app would
// peek through the seam during the slide.
const styles = StyleSheet.create({
  slabTop: {
    position: 'absolute',
    left: -OVERSHOOT,
    right: -OVERSHOOT,
    top: -OVERSHOOT,
    height: '62%',
    backgroundColor: Colors.blue,
  },
  slabBottom: {
    position: 'absolute',
    left: -OVERSHOOT,
    right: -OVERSHOOT,
    bottom: -OVERSHOOT,
    height: '62%',
    backgroundColor: Colors.blue,
  },
});
