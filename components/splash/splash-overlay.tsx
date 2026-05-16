import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

import { AnimatedHavenLogo } from './animated-haven-logo';

const HOLD_MS = 1250;
const FADE_MS = 260;

type Props = {
  onComplete: () => void;
};

export function SplashOverlay({ onComplete }: Props) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withTiming(
        0,
        { duration: FADE_MS, easing: Easing.out(Easing.quad) },
        (finished) => {
          'worklet';
          if (finished) runOnJS(onComplete)();
        },
      );
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [opacity, onComplete]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, animStyle]} pointerEvents="auto">
      <AnimatedHavenLogo color={Colors.white} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
