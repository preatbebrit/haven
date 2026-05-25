import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeartIcon } from '@/components/ui/icons/heart-icon';
import { Colors, FontFamily, TextStyle } from '@/constants/theme';

type Props = {
  /** Trigger the entrance animations. Set to false to reset; true to play. */
  active: boolean;
};

const TINY_HEART_TOP = 59;
const NUMBER_TOP = 177;
const BIG_HEART_TOP = 230;
const BE_TOP = 230;
const KIND_TOP = 290;
const OTHERWISE_TOP = 516.88;
const SMALL_HEART_TOP = 676;

// Figma node 599:12441 — House Rules 1, "Be kind". Brand-blue background,
// white headline with sky-blue display word, three magenta-outline hearts,
// "otherwise, gtfoh" rotated +5°. Close button + pagination live on the
// parent carousel.
export function Rule01({ active }: Props) {
  const insets = useSafeAreaInsets();

  // Entrance animations — each element fades in + transforms when `active` flips.
  // Strict sequence per design: 01 → Be → kind → otherwise. Hearts ride along
  // with their nearest sibling. "otherwise" enters level then tilts to 5°.
  const numberAnim = useSharedValue(0);
  const beAnim = useSharedValue(0);
  const kindAnim = useSharedValue(0);
  const tinyHeartAnim = useSharedValue(0);
  const bigHeartAnim = useSharedValue(0);
  const smallHeartAnim = useSharedValue(0);
  const otherwiseEnterAnim = useSharedValue(0);
  const otherwiseTiltAnim = useSharedValue(0);
  // Float-up + fade-out, fires after each heart finishes popping in. 0 = at rest,
  // 1 = fully floated and faded.
  const tinyHeartFloat = useSharedValue(0);
  const bigHeartFloat = useSharedValue(0);
  const smallHeartFloat = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      // Reset so the next activation replays the cascade from the start.
      numberAnim.value = 0;
      beAnim.value = 0;
      kindAnim.value = 0;
      tinyHeartAnim.value = 0;
      bigHeartAnim.value = 0;
      smallHeartAnim.value = 0;
      tinyHeartFloat.value = 0;
      bigHeartFloat.value = 0;
      smallHeartFloat.value = 0;
      otherwiseEnterAnim.value = 0;
      otherwiseTiltAnim.value = 0;
      return;
    }
    // All entrances use Easing.out(Easing.back(...)) — single overshoot then
    // settle, no continuous oscillation.
    const pop = (overshoot: number, duration = 340) =>
      withTiming(1, { duration, easing: Easing.out(Easing.back(overshoot)) });

    // Hearts float up + fade out ~250ms after they finish popping. Soft ease-out
    // so they accelerate gently and slow as they rise.
    const float = (duration = 1600) =>
      withTiming(1, { duration, easing: Easing.out(Easing.quad) });

    // 1. "01" first
    numberAnim.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    tinyHeartAnim.value = withDelay(100, pop(1.6, 320));
    tinyHeartFloat.value = withDelay(260, float()); // starts mid-pop (~50% through)
    // 2. "Be"
    beAnim.value = withDelay(320, pop(1.5, 360));
    // 3. "kind" (big sky-blue word) + big heart riding along
    kindAnim.value = withDelay(580, pop(1.3, 380));
    bigHeartAnim.value = withDelay(700, pop(1.7, 360));
    bigHeartFloat.value = withDelay(870, float()); // starts mid-pop (~50% through)
    // 4. "otherwise, gtfoh" — comes in LEVEL first, then tilts to 5°
    otherwiseEnterAnim.value = withDelay(
      940,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );
    smallHeartAnim.value = withDelay(1060, pop(1.5, 340));
    smallHeartFloat.value = withDelay(1230, float()); // starts mid-pop (~50% through)
    // 5. After "otherwise" lands, tilt it down to the 5° resting angle
    otherwiseTiltAnim.value = withDelay(
      1320,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }),
    );
  }, [
    active,
    numberAnim,
    beAnim,
    kindAnim,
    tinyHeartAnim,
    bigHeartAnim,
    smallHeartAnim,
    tinyHeartFloat,
    bigHeartFloat,
    smallHeartFloat,
    otherwiseEnterAnim,
    otherwiseTiltAnim,
  ]);

  const numberStyle = useAnimatedStyle(() => ({
    opacity: numberAnim.value,
    transform: [{ translateY: (1 - numberAnim.value) * -16 }],
  }));
  const beStyle = useAnimatedStyle(() => ({
    opacity: beAnim.value,
    transform: [{ scale: 0.7 + beAnim.value * 0.3 }],
  }));
  const kindStyle = useAnimatedStyle(() => ({
    opacity: kindAnim.value,
    transform: [{ scale: 0.85 + kindAnim.value * 0.15 }],
  }));
  // Heart styles compose three phases:
  //   1. pop-in scale + rotation (anim value 0 → 1)
  //   2. float-up translateY (float value 0 → 1 pushes -px)
  //   3. fade-out via opacity = anim × (1 - float)
  const tinyHeartStyle = useAnimatedStyle(() => ({
    opacity: tinyHeartAnim.value * (1 - tinyHeartFloat.value),
    transform: [
      { translateY: -tinyHeartFloat.value * 90 },
      { scale: tinyHeartAnim.value },
      { rotate: `${(1 - tinyHeartAnim.value) * -25}deg` },
    ],
  }));
  const bigHeartStyle = useAnimatedStyle(() => ({
    opacity: bigHeartAnim.value * (1 - bigHeartFloat.value),
    transform: [
      { translateY: -bigHeartFloat.value * 140 },
      { scale: 0.5 + bigHeartAnim.value * 0.5 },
      { rotate: `${(1 - bigHeartAnim.value) * 20}deg` },
    ],
  }));
  const smallHeartStyle = useAnimatedStyle(() => ({
    opacity: smallHeartAnim.value * (1 - smallHeartFloat.value),
    transform: [
      { translateY: -smallHeartFloat.value * 110 },
      { scale: smallHeartAnim.value },
      { rotate: `${(1 - smallHeartAnim.value) * -15}deg` },
    ],
  }));
  const otherwiseStyle = useAnimatedStyle(() => ({
    opacity: otherwiseEnterAnim.value,
    transform: [
      { translateY: (1 - otherwiseEnterAnim.value) * 18 },
      { rotate: `${otherwiseTiltAnim.value * 5}deg` },
    ],
  }));

  // Tiny heart at top mirrors where the close button is parked in the design.
  const tinyHeartTop = Math.max(insets.top + 12, TINY_HEART_TOP);

  return (
    <View style={styles.screen}>
      {/* Tiny heart up top (just right of "01", aligned with the close button) */}
      <Animated.View style={[styles.tinyHeartWrap, { top: tinyHeartTop }, tinyHeartStyle]} pointerEvents="none">
        <HeartIcon size={29} color={Colors.magenta} strokeWidth={2} />
      </Animated.View>

      {/* "01" number, horizontally centered */}
      <Animated.Text style={[styles.number, numberStyle]}>01</Animated.Text>

      {/* Big heart, right side, overlapping with "kind" */}
      <Animated.View style={[styles.bigHeartWrap, bigHeartStyle]} pointerEvents="none">
        <HeartIcon size={163} color={Colors.magenta} strokeWidth={2} />
      </Animated.View>

      {/* "Be" — small white display word */}
      <Animated.Text style={[styles.be, beStyle]}>Be</Animated.Text>

      {/* "kind" — huge sky-blue display word, sits behind/below "Be" */}
      <Animated.Text style={[styles.kind, kindStyle]}>kind</Animated.Text>

      {/* "otherwise, gtfoh" — enters level, then tilts to 5° pivoting on its left edge */}
      <View style={styles.otherwiseWrap} pointerEvents="none">
        <Animated.View style={[styles.otherwiseRotor, otherwiseStyle]}>
          <Text style={styles.otherwise}>otherwise, gtfoh</Text>
        </Animated.View>
      </View>

      {/* Small heart, bottom-left, partially off-screen */}
      <Animated.View style={[styles.smallHeartWrap, smallHeartStyle]} pointerEvents="none">
        <HeartIcon size={57} color={Colors.magenta} strokeWidth={2} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: 'relative',
  },
  tinyHeartWrap: {
    position: 'absolute',
    left: 202,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    position: 'absolute',
    top: NUMBER_TOP,
    left: 0,
    right: 0,
    textAlign: 'center',
    ...TextStyle.h1,
    color: Colors.white,
  },
  bigHeartWrap: {
    position: 'absolute',
    top: BIG_HEART_TOP,
    left: 232,
    width: 196,
    height: 196,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // "Be" — Manrope SemiBold 80. lineHeight bumped above fontSize to give the
  // cap glyphs breathing room (lineHeight === fontSize clips tops on iOS).
  // paddingRight guards against negative letter-spacing pulling the "e" tail
  // beyond RN's measured width.
  be: {
    position: 'absolute',
    top: BE_TOP,
    left: 73,
    fontFamily: FontFamily.semiBold,
    fontSize: 80,
    lineHeight: 96,
    letterSpacing: -4.8,
    color: Colors.white,
    paddingRight: 8,
    zIndex: 2,
  },
  // "kind" — Manrope ExtraLight (closest to Figma Light 300) 150. Same lineHeight
  // + paddingRight treatment as "Be" so the descender and right edge of "d" don't
  // get clipped.
  kind: {
    position: 'absolute',
    top: KIND_TOP,
    left: 67,
    fontFamily: FontFamily.extraLight,
    fontSize: 150,
    lineHeight: 180,
    letterSpacing: -9,
    color: Colors.skyBlue,
    paddingRight: 12,
    zIndex: 1,
  },
  otherwiseWrap: {
    position: 'absolute',
    top: OTHERWISE_TOP,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Rotor hugs the text width so the rotation pivot is the text's left edge,
  // not the screen center. transformOrigin needs the wrapper to fit content.
  otherwiseRotor: {
    transformOrigin: 'left center',
  },
  // "otherwise, gtfoh" — Manrope SemiBold 40, line-height 44, letter-spacing -2.4
  otherwise: {
    fontFamily: FontFamily.semiBold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -2.4,
    color: Colors.white,
  },
  smallHeartWrap: {
    position: 'absolute',
    top: SMALL_HEART_TOP,
    left: -10,
    width: 69,
    height: 69,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

