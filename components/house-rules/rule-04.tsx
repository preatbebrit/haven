import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BeeIllustration } from '@/components/house-rules/bee-illustration';
import { Colors, FontFamily } from '@/constants/theme';

type Props = {
  /** Trigger the entrance animations + start the wing flap. */
  active: boolean;
};

const NUMBER_TOP = 177;
const BEE_TOP = 214;
const YOUR_TOP = 323;
const SELF_TOP = 443; // YOUR_TOP + tight lineHeight 120
const BODY_TOP = 636;

const BEE_WIDTH = 222;
const BEE_HEIGHT = 158.28;
// Center the bee horizontally in the 393-wide design frame
const BEE_LEFT = (393 - BEE_WIDTH) / 2;

// Wing flap range: 0 = rest, 1 = fully flapped (wings rotated outward).
const FLAP_REST = 0;
const FLAP_MAX = 1;

// Flight loop: bee zips off-screen left, teleports to right side off-screen,
// flies back in to its rest spot, then pauses before looping again.
const FLY_OFF_LEFT = -420; // translateX that puts the bee fully off-left
const FLY_OFF_RIGHT = 420; // translateX that parks the bee off-right
const FLY_OUT_DURATION = 1100;
const FLY_IN_DURATION = 1100;
const REST_DURATION = 2800;
const FLIGHT_START_DELAY = 2400; // gap after entrance before first flight

// Figma node 615:13898 — House Rules 4, "yourself". Teal background,
// brand-blue display word "your-self" wrapping to 2 lines under a stylized bee
// whose wings flap continuously while the card is active.
export function Rule04({ active }: Props) {
  const numberAnim = useSharedValue(0);
  const beeAnim = useSharedValue(0);
  const yourAnim = useSharedValue(0);
  const selfAnim = useSharedValue(0);
  const bodyAnim = useSharedValue(0);
  // Wing flap — looped between FLAP_REST and FLAP_MAX while active.
  const flap = useSharedValue(FLAP_REST);
  // Flight translateX — drives the bee zipping off-left and back in from right.
  const flightX = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      numberAnim.value = 0;
      beeAnim.value = 0;
      yourAnim.value = 0;
      selfAnim.value = 0;
      bodyAnim.value = 0;
      cancelAnimation(flap);
      cancelAnimation(flightX);
      flap.value = FLAP_REST;
      flightX.value = 0;
      return;
    }
    // SPEED scales the entry cascade only. Continuous loops (wing flap,
    // flight) keep their natural cadence so the bee doesn't read as frantic.
    const SPEED = 0.85;
    const t = (ms: number) => ms * SPEED;
    const pop = (overshoot: number, duration = 340) =>
      withTiming(1, { duration: t(duration), easing: Easing.out(Easing.back(overshoot)) });

    // 1. "04"
    numberAnim.value = withTiming(1, { duration: t(280), easing: Easing.out(Easing.cubic) });
    // 2. Bee scales in
    beeAnim.value = withDelay(t(220), pop(1.6, 440));
    // 3. Start wing flap shortly after the bee lands, loop forever
    flap.value = withDelay(
      t(560),
      withRepeat(
        withTiming(FLAP_MAX, {
          duration: 220,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      ),
    );
    // 3b. Flight loop: rest → zip off-left → teleport off-right → fly back in
    // → rest. Repeats forever while card is active.
    flightX.value = withDelay(
      t(FLIGHT_START_DELAY),
      withRepeat(
        withSequence(
          // Accelerate out to the left
          withTiming(FLY_OFF_LEFT, {
            duration: FLY_OUT_DURATION,
            easing: Easing.in(Easing.cubic),
          }),
          // Instantly park off the right edge (no visible animation)
          withTiming(FLY_OFF_RIGHT, { duration: 0 }),
          // Decelerate in from the right back to the rest spot
          withTiming(0, {
            duration: FLY_IN_DURATION,
            easing: Easing.out(Easing.cubic),
          }),
          // Hold at rest before looping
          withTiming(0, { duration: REST_DURATION }),
        ),
        -1,
        false,
      ),
    );
    // 4. "your-"
    yourAnim.value = withDelay(t(640), pop(1.3, 420));
    // 5. "self"
    selfAnim.value = withDelay(t(880), pop(1.3, 420));
    // 6. Body text
    bodyAnim.value = withDelay(
      t(1180),
      withTiming(1, { duration: t(380), easing: Easing.out(Easing.cubic) }),
    );
  }, [active, numberAnim, beeAnim, yourAnim, selfAnim, bodyAnim, flap, flightX]);

  const numberStyle = useAnimatedStyle(() => ({
    opacity: numberAnim.value,
    transform: [{ translateY: (1 - numberAnim.value) * -16 }],
  }));
  const beeStyle = useAnimatedStyle(() => ({
    opacity: beeAnim.value,
    transform: [
      { translateX: flightX.value },
      { scale: 0.6 + beeAnim.value * 0.4 },
    ],
  }));
  const yourStyle = useAnimatedStyle(() => ({
    opacity: yourAnim.value,
    transform: [{ translateY: (1 - yourAnim.value) * 24 }],
  }));
  const selfStyle = useAnimatedStyle(() => ({
    opacity: selfAnim.value,
    transform: [{ translateY: (1 - selfAnim.value) * 24 }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: bodyAnim.value,
    transform: [{ translateY: (1 - bodyAnim.value) * 14 }],
  }));

  return (
    <View style={styles.screen}>
      {/* "04" centered */}
      <Animated.Text style={[styles.number, numberStyle]}>04</Animated.Text>

      {/* Bee — sits centered behind the headline. Wings flap via `flap` shared value. */}
      <Animated.View style={[styles.beeWrap, beeStyle]} pointerEvents="none">
        <BeeIllustration
          width={BEE_WIDTH}
          height={BEE_HEIGHT}
          color={Colors.black}
          flap={flap}
        />
      </Animated.View>

      {/* "your-" — huge blue display word */}
      <Animated.Text style={[styles.displayWord, { top: YOUR_TOP }, yourStyle]}>
        your-
      </Animated.Text>

      {/* "self" — same style, second line */}
      <Animated.Text style={[styles.displayWord, { top: SELF_TOP }, selfStyle]}>
        self
      </Animated.Text>

      {/* Body text */}
      <Animated.Text style={[styles.body, bodyStyle]}>
        that&rsquo;s when you&rsquo;re at your best, and when other&rsquo;s like you the most.
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
  beeWrap: {
    position: 'absolute',
    top: BEE_TOP,
    left: BEE_LEFT,
    width: BEE_WIDTH,
    height: BEE_HEIGHT,
  },
  // "your-" / "self" — Manrope Bold 150, tight lineHeight (120) for the stacked
  // pair. Centered horizontally. paddingTop guards cap overshoot.
  displayWord: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 150,
    lineHeight: 150,
    letterSpacing: -9,
    color: Colors.blue,
    paddingTop: 10,
  },
  body: {
    position: 'absolute',
    top: BODY_TOP,
    left: 16,
    right: 16,
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.8,
    color: Colors.black,
  },
});
