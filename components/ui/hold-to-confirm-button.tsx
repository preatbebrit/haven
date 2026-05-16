import * as Haptics from 'expo-haptics';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export const HOLD_DURATION_MS = 1500;

const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  label: string;
  /** Optional label shown while the user is holding. Defaults to `label`. */
  holdingLabel?: string;
  onConfirm: () => void;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  /** Color of the progress fill that grows L→R as the user holds. */
  fillColor?: string;
  /** Color of the spinner that appears while holding. */
  spinnerColor?: string;
  /**
   * If set, the label color crossfades from `labelStyle.color` to this as the
   * fill grows — useful when the rest color matches the fill (e.g., cherry
   * text on cherry fill) and would otherwise become illegible.
   */
  activeLabelColor?: string;
  /** Same idea for the spinner stroke. */
  activeSpinnerColor?: string;
  /** Optional leading slot (e.g., an icon). */
  leading?: ReactNode;
  /** Override the trailing slot. Defaults to the rotating spinner. */
  trailing?: ReactNode;
  accessibilityLabel?: string;
};

// Crossfade range: hold the rest color through 45%, transition between 45-55%,
// settle on the active color from 55% on. Sharp enough to feel like the text
// flips with the fill, but smooth enough to not flicker on slow holds.
const COLOR_STOPS = [0, 0.45, 0.55, 1] as const;

function HoldSpinner({
  restColor,
  activeColor,
  progress,
}: {
  restColor: string;
  activeColor?: string;
  progress: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => {
    if (!activeColor) return { stroke: restColor };
    return {
      stroke: interpolateColor(
        progress.value,
        [...COLOR_STOPS],
        [restColor, restColor, activeColor, activeColor],
      ),
    };
  });
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <AnimatedPath
        animatedProps={animatedProps}
        d="M 12 2 A 10 10 0 0 1 22 12"
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

// Press-and-hold confirmation button. The action fires only after the user
// holds for HOLD_DURATION_MS; releasing early cancels and resets — the timing
// callback's `done` flag is false when withTiming is interrupted.
export function HoldToConfirmButton({
  label,
  holdingLabel,
  onConfirm,
  style,
  labelStyle,
  fillColor = 'rgba(0,0,0,0.22)',
  spinnerColor = Colors.black,
  activeLabelColor,
  activeSpinnerColor,
  leading,
  trailing,
  accessibilityLabel,
}: Props) {
  const flatLabel = StyleSheet.flatten(labelStyle ?? {}) as TextStyle;
  const restLabelColor = (flatLabel.color as string | undefined) ?? Colors.black;
  const progress = useSharedValue(0);
  const spin = useSharedValue(0);
  const [holding, setHolding] = useState(false);

  const onConfirmRef = useRef(onConfirm);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
  });

  const triggerConfirm = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onConfirmRef.current();
  }, []);

  useEffect(() => {
    if (holding) {
      spin.value = 0;
      spin.value = withRepeat(
        withTiming(360, { duration: 900, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      spin.value = 0;
    }
  }, [holding, spin]);

  const handlePressIn = useCallback(() => {
    setHolding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    progress.value = withTiming(
      1,
      { duration: HOLD_DURATION_MS, easing: Easing.linear },
      (done) => {
        'worklet';
        if (done) runOnJS(triggerConfirm)();
      },
    );
  }, [progress, triggerConfirm]);

  const handlePressOut = useCallback(() => {
    setHolding(false);
    progress.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    opacity: progress.value > 0 ? 1 : 0,
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const labelAnimStyle = useAnimatedStyle(() => {
    if (!activeLabelColor) return {};
    return {
      color: interpolateColor(
        progress.value,
        [...COLOR_STOPS],
        [restLabelColor, restLabelColor, activeLabelColor, activeLabelColor],
      ),
    };
  });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.btn, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Hold to ${label.toLowerCase()}`}
      accessibilityHint="Press and hold for 2 seconds to confirm"
    >
      <Animated.View
        style={[styles.fill, fillStyle, { backgroundColor: fillColor }]}
        pointerEvents="none"
      />
      <View style={styles.slot}>{leading}</View>
      <AnimatedText style={[styles.label, labelStyle, labelAnimStyle]} numberOfLines={1}>
        {holding ? holdingLabel ?? label : label}
      </AnimatedText>
      <Animated.View style={[styles.slot, spinnerStyle]} pointerEvents="none">
        {trailing ?? (
          <HoldSpinner
            restColor={spinnerColor}
            activeColor={activeSpinnerColor}
            progress={progress}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  slot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    textAlign: 'center',
  },
});
