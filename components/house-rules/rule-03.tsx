import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { EyeIcon } from '@/components/ui/icons/eye-icon';
import { Colors, FontFamily } from '@/constants/theme';

type Props = {
  /** Trigger the entrance animations. Set to false to reset; true to play. */
  active: boolean;
};

const NUMBER_TOP = 177;
const READ_TOP = 240;
const ROOM_TOP = 320;
const EYES_TOP = 454;
const BODY_TOP = 636;

// pupilX is an offset from the design default (iris cx = 71, looking left).
// Sweep from -5 (slightly left) → +35 (looking right) → 0 (settle back to default).
const PUPIL_SWEEP_LEFT = -1;
const PUPIL_SWEEP_RIGHT = 31;

// Figma node 602:13583 — House Rules 3, "read the room". Light-purple background,
// black + teal text, two stylized black eyes whose pupils sweep left → right on
// entry.
export function Rule03({ active }: Props) {
  const numberAnim = useSharedValue(0);
  const readAnim = useSharedValue(0);
  const theAnim = useSharedValue(0);
  const roomAnim = useSharedValue(0);
  const eyesAnim = useSharedValue(0);
  const bodyAnim = useSharedValue(0);
  // Drives both eyes' pupils together. Offset from the design's default-left
  // iris position. Negative = further left, positive = right.
  const pupilX = useSharedValue(PUPIL_SWEEP_LEFT);

  useEffect(() => {
    if (!active) {
      numberAnim.value = 0;
      readAnim.value = 0;
      theAnim.value = 0;
      roomAnim.value = 0;
      eyesAnim.value = 0;
      bodyAnim.value = 0;
      pupilX.value = PUPIL_SWEEP_LEFT;
      return;
    }
    const SPEED = 0.85;
    const t = (ms: number) => ms * SPEED;
    const pop = (overshoot: number, duration = 340) =>
      withTiming(1, { duration: t(duration), easing: Easing.out(Easing.back(overshoot)) });

    // 1. "03"
    numberAnim.value = withTiming(1, { duration: t(280), easing: Easing.out(Easing.cubic) });
    // 2. "read" first
    readAnim.value = withDelay(t(260), pop(1.3, 400));
    // 3. "the" lands shortly after "read"
    theAnim.value = withDelay(t(480), pop(1.3, 400));
    // 4. "room" (the big teal display word)
    roomAnim.value = withDelay(t(780), pop(1.4, 440));
    // 5. Eyes blink in (slight scale + fade)
    eyesAnim.value = withDelay(t(1080), pop(1.7, 440));
    // 6. Pupils sweep left → right, then settle back to the design default
    pupilX.value = withDelay(
      t(1380),
      withSequence(
        withTiming(PUPIL_SWEEP_RIGHT, { duration: t(1200), easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: t(480), easing: Easing.out(Easing.cubic) }),
      ),
    );
    // 7. Body text fades up
    bodyAnim.value = withDelay(
      t(1480),
      withTiming(1, { duration: t(380), easing: Easing.out(Easing.cubic) }),
    );
  }, [active, numberAnim, readAnim, theAnim, roomAnim, eyesAnim, bodyAnim, pupilX]);

  const numberStyle = useAnimatedStyle(() => ({
    opacity: numberAnim.value,
    transform: [{ translateY: (1 - numberAnim.value) * -16 }],
  }));
  const readStyle = useAnimatedStyle(() => ({
    opacity: readAnim.value,
    transform: [{ translateY: (1 - readAnim.value) * 20 }],
  }));
  const theStyle = useAnimatedStyle(() => ({
    opacity: theAnim.value,
    transform: [{ translateY: (1 - theAnim.value) * 20 }],
  }));
  const roomStyle = useAnimatedStyle(() => ({
    opacity: roomAnim.value,
    transform: [{ scale: 0.85 + roomAnim.value * 0.15 }],
  }));
  const eyesStyle = useAnimatedStyle(() => ({
    opacity: eyesAnim.value,
    transform: [{ scale: 0.7 + eyesAnim.value * 0.3 }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: bodyAnim.value,
    transform: [{ translateY: (1 - bodyAnim.value) * 14 }],
  }));

  return (
    <View style={styles.screen}>
      {/* "03" centered */}
      <Animated.Text style={[styles.number, numberStyle]}>03</Animated.Text>

      {/* "read" then "the" — animated in separately */}
      <View style={styles.readRow} pointerEvents="none">
        <Animated.Text style={[styles.readWord, readStyle]}>read</Animated.Text>
        <Animated.Text style={[styles.readWord, theStyle]}>the</Animated.Text>
      </View>

      {/* "room" — teal display word */}
      <Animated.Text style={[styles.room, roomStyle]}>room</Animated.Text>

      {/* Eyes — two side by side, sized big enough that the right eye runs
          off the screen edge. Parent card's overflow:hidden clips naturally. */}
      <Animated.View style={[styles.eyesRow, eyesStyle]} pointerEvents="none">
        <EyeIcon size={198} color={Colors.black} pupilX={pupilX} />
        <EyeIcon size={198} color={Colors.black} pupilX={pupilX} />
      </Animated.View>

      {/* Body text */}
      <Animated.Text style={[styles.body, bodyStyle]}>
        everyone is allowed to take up space. but be respectful, don&rsquo;t spam, create the community you want.
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
  // Row holding "read" + "the" — flex so each word can animate independently
  // while staying side by side with a natural word space.
  readRow: {
    position: 'absolute',
    top: READ_TOP,
    left: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 20, // approximates a word-space at fontSize 80
  },
  // Each word — Manrope Regular 80, lineHeight ≥ fontSize to avoid clipping.
  readWord: {
    fontFamily: FontFamily.regular,
    fontSize: 80,
    lineHeight: 88,
    letterSpacing: -4.8,
    color: Colors.black,
    paddingRight: 8,
  },
  // "room" — huge teal display word; lineHeight loosened for safe rendering
  room: {
    position: 'absolute',
    top: ROOM_TOP,
    left: 15,
    width: 363,
    fontFamily: FontFamily.semiBold,
    fontSize: 150,
    lineHeight: 165,
    letterSpacing: -9,
    color: Colors.teal,
    paddingRight: 12,
  },
  // Eyes start mid-left and run off the right edge. No `right` constraint so
  // the row can extend past the screen; the card's overflow:hidden does the
  // clipping.
  eyesRow: {
    position: 'absolute',
    top: EYES_TOP,
    left: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
