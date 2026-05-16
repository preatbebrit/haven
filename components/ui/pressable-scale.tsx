import { forwardRef } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DEFAULT_SCALE = 0.88;
// Snap-in keeps the squeeze visible even when onPress immediately dismisses
// the screen (e.g. the Answers X). A timed press-in would only reach ~0.95
// on a tap that releases in 50ms, leaving almost no spring distance.
const PRESS_IN_DURATION = 40;
const PRESS_OUT_SPRING = {
  damping: 6,
  stiffness: 280,
  mass: 0.6,
  overshootClamping: false,
} as const;

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

export const PressableScale = forwardRef<View, Props>(function PressableScale(
  { scaleTo = DEFAULT_SCALE, style, onPressIn, onPressOut, disabled, ...rest },
  ref,
) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      ref={ref as never}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        if (!disabled) {
          scale.value = withTiming(scaleTo, { duration: PRESS_IN_DURATION });
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!disabled) {
          scale.value = withSpring(1, PRESS_OUT_SPRING);
        }
        onPressOut?.(e);
      }}
      disabled={disabled}
      {...rest}
    />
  );
});
