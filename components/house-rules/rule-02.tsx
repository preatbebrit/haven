import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Strikethrough } from '@/components/house-rules/strikethrough';
import { Colors, FontFamily } from '@/constants/theme';

type Props = {
  /** Trigger the entrance animations. Set to false to reset; true to play. */
  active: boolean;
};

const NUMBER_TOP = 177;
const HEADLINE_TOP = 268;
const DATING_TOP = 420;
const STRIKE_TOP = 458;
const BODY_TOP = 530;
const BODY_2_TOP = 626;

// Figma node 602:13570 — House Rules 2, "h@ven is not a dating app".
// Brand-purple background. "dating app" is green (#00FF40) with a magenta/cherry
// hand-drawn strikethrough across it.
export function Rule02({ active }: Props) {
  const numberAnim = useSharedValue(0);
  const headlineAnim = useSharedValue(0);
  const datingAnim = useSharedValue(0);
  const strikeAnim = useSharedValue(0);
  const body1Anim = useSharedValue(0);
  const body2Anim = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      numberAnim.value = 0;
      headlineAnim.value = 0;
      datingAnim.value = 0;
      strikeAnim.value = 0;
      body1Anim.value = 0;
      body2Anim.value = 0;
      return;
    }
    const pop = (overshoot: number, duration = 340) =>
      withTiming(1, { duration, easing: Easing.out(Easing.back(overshoot)) });

    // 1. "02"
    numberAnim.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    // 2. "h@ven is not a" (slide up + fade)
    headlineAnim.value = withDelay(280, pop(1.3, 420));
    // 3. "dating app" (the green word)
    datingAnim.value = withDelay(620, pop(1.4, 380));
    // 4. Strikethrough draws across — sweeps from left to right
    strikeAnim.value = withDelay(
      880,
      withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) }),
    );
    // 5. Body text fades up
    body1Anim.value = withDelay(
      1180,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }),
    );
    body2Anim.value = withDelay(
      1340,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }),
    );
  }, [active, numberAnim, headlineAnim, datingAnim, strikeAnim, body1Anim, body2Anim]);

  const numberStyle = useAnimatedStyle(() => ({
    opacity: numberAnim.value,
    transform: [{ translateY: (1 - numberAnim.value) * -16 }],
  }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineAnim.value,
    transform: [{ translateY: (1 - headlineAnim.value) * 24 }],
  }));
  const datingStyle = useAnimatedStyle(() => ({
    opacity: datingAnim.value,
    transform: [{ translateY: (1 - datingAnim.value) * 24 }],
  }));
  // Strikethrough scales horizontally from the left — visually "draws" across
  // the word. transformOrigin: 'left center' anchors to the left edge.
  const strikeStyle = useAnimatedStyle(() => ({
    opacity: strikeAnim.value > 0 ? 1 : 0,
    transform: [{ scaleX: strikeAnim.value }],
  }));
  const body1Style = useAnimatedStyle(() => ({
    opacity: body1Anim.value,
    transform: [{ translateY: (1 - body1Anim.value) * 14 }],
  }));
  const body2Style = useAnimatedStyle(() => ({
    opacity: body2Anim.value,
    transform: [{ translateY: (1 - body2Anim.value) * 14 }],
  }));

  return (
    <View style={styles.screen}>
      {/* "02" centered */}
      <Animated.Text style={[styles.number, numberStyle]}>02</Animated.Text>

      {/* "h@ven is not a" — wraps to 2 lines */}
      <Animated.Text style={[styles.headline, headlineStyle]}>h@ven is not a</Animated.Text>

      {/* "dating app" — green */}
      <Animated.Text style={[styles.dating, datingStyle]}>dating app</Animated.Text>

      {/* Strikethrough across "dating app" */}
      <View style={styles.strikeWrap} pointerEvents="none">
        <Animated.View style={[styles.strikeRotor, strikeStyle]}>
          <Strikethrough width={380} height={8} color={Colors.cherry} strokeWidth={4} />
        </Animated.View>
      </View>

      {/* Body line 1 — white */}
      <Animated.Text style={[styles.body1, body1Style]}>
        if you do find love here that&rsquo;s great, but don&rsquo;t post your personal add or kinks
      </Animated.Text>

      {/* Body line 2 — slightly lighter (gray-100 in dark-mode token = near-white) */}
      <Animated.Text style={[styles.body2, body2Style]}>
        (unless it&rsquo;s relevant to the chat.)
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
    color: Colors.white,
  },
  // "h@ven is not a" — fontSize 80, tight lineHeight = fontSize so the two
  // lines stack snugly. paddingTop accommodates cap overshoot that would
  // otherwise clip when lineHeight === fontSize. paddingRight handles the
  // negative letter-spacing right-edge pull.
  headline: {
    position: 'absolute',
    top: HEADLINE_TOP,
    left: 15,
    width: 363,
    fontFamily: FontFamily.semiBold,
    fontSize: 80,
    lineHeight: 80,
    letterSpacing: -4.8,
    color: Colors.white,
    paddingTop: 6,
    paddingRight: 8,
  },
  // "dating app" — green, single line, same tight lineHeight as headline
  dating: {
    position: 'absolute',
    top: DATING_TOP,
    left: 15,
    fontFamily: FontFamily.semiBold,
    fontSize: 80,
    lineHeight: 80,
    letterSpacing: -4.8,
    color: Colors.green,
    paddingTop: 6,
    paddingRight: 8,
  },
  strikeWrap: {
    position: 'absolute',
    top: STRIKE_TOP,
    left: 7.5,
    width: 380,
    height: 8,
    overflow: 'visible',
  },
  strikeRotor: {
    transformOrigin: 'left center',
  },
  body1: {
    position: 'absolute',
    top: BODY_TOP,
    left: 16,
    right: 16,
    fontFamily: FontFamily.semiBold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.96,
    color: Colors.white,
  },
  body2: {
    position: 'absolute',
    top: BODY_2_TOP,
    left: 16,
    right: 16,
    fontFamily: FontFamily.semiBold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.96,
    color: Colors.gray100, // near-white on dark bg
  },
});
