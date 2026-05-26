import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Colors, FontFamily } from '@/constants/theme';

type Props = {
  /** Trigger the entrance animations. Set to false to reset; true to play. */
  active: boolean;
};

const NUMBER_TOP = 177;
const HEADLINE_TOP = 253;
const LINE_GAP = 78; // tight stacking that matches the Figma display feel
const SUBTITLE_TOP = 590;

// The four lines of the headline, hard-coded so each can animate separately.
const LINES = ['remember', 'that we are', 'all trying', 'our best.'] as const;

// Figma node 615:13921 — House Rules 5, "remember that we are all trying our
// best." Magenta background, Manrope Light display text (using ExtraLight 200
// since 300 Light isn't loaded). The 4 headline lines cascade in one by one;
// the subtitle ":)" slides up at the end.
export function Rule05({ active }: Props) {
  const numberAnim = useSharedValue(0);
  // One shared value per line — 4 lines total
  const lineAnim0 = useSharedValue(0);
  const lineAnim1 = useSharedValue(0);
  const lineAnim2 = useSharedValue(0);
  const lineAnim3 = useSharedValue(0);
  const subtitleAnim = useSharedValue(0);

  const lineAnims = [lineAnim0, lineAnim1, lineAnim2, lineAnim3];

  useEffect(() => {
    if (!active) {
      numberAnim.value = 0;
      lineAnim0.value = 0;
      lineAnim1.value = 0;
      lineAnim2.value = 0;
      lineAnim3.value = 0;
      subtitleAnim.value = 0;
      return;
    }
    const SPEED = 0.85;
    const t = (ms: number) => ms * SPEED;
    // 1. "05"
    numberAnim.value = withTiming(1, { duration: t(280), easing: Easing.out(Easing.cubic) });
    // 2. Headline lines cascade in one at a time
    const LINE_START = 280;
    const LINE_STAGGER = 220;
    lineAnims.forEach((v, i) => {
      v.value = withDelay(
        t(LINE_START + i * LINE_STAGGER),
        withTiming(1, { duration: t(460), easing: Easing.out(Easing.cubic) }),
      );
    });
    // 3. Subtitle lands after the last headline line
    subtitleAnim.value = withDelay(
      t(LINE_START + LINES.length * LINE_STAGGER + 80),
      withTiming(1, { duration: t(440), easing: Easing.out(Easing.cubic) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const numberStyle = useAnimatedStyle(() => ({
    opacity: numberAnim.value,
    transform: [{ translateY: (1 - numberAnim.value) * -16 }],
  }));
  const line0Style = useAnimatedStyle(() => ({
    opacity: lineAnim0.value,
    transform: [{ translateY: (1 - lineAnim0.value) * 28 }],
  }));
  const line1Style = useAnimatedStyle(() => ({
    opacity: lineAnim1.value,
    transform: [{ translateY: (1 - lineAnim1.value) * 28 }],
  }));
  const line2Style = useAnimatedStyle(() => ({
    opacity: lineAnim2.value,
    transform: [{ translateY: (1 - lineAnim2.value) * 28 }],
  }));
  const line3Style = useAnimatedStyle(() => ({
    opacity: lineAnim3.value,
    transform: [{ translateY: (1 - lineAnim3.value) * 28 }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleAnim.value,
    transform: [{ translateY: (1 - subtitleAnim.value) * 18 }],
  }));

  const lineStyles = [line0Style, line1Style, line2Style, line3Style];

  return (
    <View style={styles.screen}>
      {/* "05" centered */}
      <Animated.Text style={[styles.number, numberStyle]}>05</Animated.Text>

      {/* 4 headline lines, each absolutely positioned and animating separately */}
      {LINES.map((line, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.headlineLine,
            { top: HEADLINE_TOP + i * LINE_GAP },
            lineStyles[i],
          ]}
        >
          {line}
        </Animated.Text>
      ))}

      {/* Subtitle */}
      <Animated.Text style={[styles.subtitle, subtitleStyle]}>
        So be patient with others :)
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: 'relative',
  },
  number: {
    position: 'absolute',
    top: NUMBER_TOP,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -2.4,
    color: Colors.black,
  },
  // Headline line — Manrope ExtraLight as proxy for Figma's Light (300 isn't
  // loaded). lineHeight slightly above fontSize to avoid cap-glyph clipping.
  headlineLine: {
    position: 'absolute',
    left: 15,
    right: 15,
    fontFamily: FontFamily.extraLight,
    fontSize: 80,
    lineHeight: 88,
    letterSpacing: -4.8,
    color: Colors.black,
    paddingRight: 8,
  },
  // "So be patient with others :)" — H2 sized, Medium weight for a lighter feel
  subtitle: {
    position: 'absolute',
    top: SUBTITLE_TOP,
    left: 16,
    right: 16,
    fontFamily: FontFamily.medium,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -1.28,
    color: Colors.black,
  },
});
