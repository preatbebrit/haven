import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { HouseIllustration } from '@/components/home/house-illustration';
import { TILE_HEIGHT } from '@/components/home/house-rules-tile-visual';
import { CloseIcon } from '@/components/ui/icons/close-icon';
import { Colors, FontFamily, Radius, TextStyle } from '@/constants/theme';
import type { Rect } from '@/lib/house-rules-transition';

type Props = {
  onPress: (rect: Rect) => void;
  onDismiss: () => void;
};

// Figma node 591:12302 — fixed height tile (122), 12px radius, blue bg.
// Text block sits absolute at left:120 (vertically centered); house illustration
// occupies the left 0-105px in absolute position; X is top-right at 8/8.
// The "Read me" badge bleeds above the tile's top-left edge, rotated -5deg.
const BADGE_BASE_ROTATION = -5;
const BADGE_WOBBLE_AMPLITUDE = 3; // degrees on either side of the base
const BADGE_WOBBLE_DURATION = 900; // ms per half-cycle

const HOUSE_LEFT = 4;
const HOUSE_TOP = 12;
const HOUSE_WIDTH = 102;
const HOUSE_HEIGHT = 94;
const TEXT_LEFT = 120;

// Dismiss animation: tile shrinks + fades; height collapses so the chat cards
// reflow up in sync. Once finished, the parent unmounts the tile.
const DISMISS_DURATION = 320;

export function HouseRulesTile({ onPress, onDismiss }: Props) {
  const tileRef = useRef<View>(null);
  const badgeScale = useSharedValue(0);
  const badgeRotation = useSharedValue(BADGE_BASE_ROTATION);
  // 0 = visible; 1 = fully dismissed (collapsed + invisible)
  const dismissProgress = useSharedValue(0);
  const dismissingRef = useRef(false);

  useEffect(() => {
    // Small startup delay so the pop is visible even when chat-selection mounts
    // behind the splash / during a route transition.
    badgeScale.value = withDelay(
      180,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.back(1.8)),
      }),
    );
    // After the pop-in lands, drift gently between (base - amp) and (base + amp)
    // and reverse forever. Sine easing keeps the swing soft at the extremes.
    badgeRotation.value = withDelay(
      830,
      withRepeat(
        withTiming(BADGE_BASE_ROTATION + BADGE_WOBBLE_AMPLITUDE, {
          duration: BADGE_WOBBLE_DURATION,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      ),
    );
  }, [badgeScale, badgeRotation]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${badgeRotation.value}deg` },
      { scale: badgeScale.value },
    ],
  }));

  // Outer fades + scales everything together (badge + tile)
  const outerDismissStyle = useAnimatedStyle(() => ({
    opacity: 1 - dismissProgress.value,
    transform: [{ scale: 1 - dismissProgress.value * 0.1 }],
  }));

  // Inner collapses the tile's height so the chat cards reflow up in sync
  const collapseStyle = useAnimatedStyle(() => ({
    height: interpolate(dismissProgress.value, [0, 1], [TILE_HEIGHT, 0], 'clamp'),
  }));

  function handleDismissPress() {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    dismissProgress.value = withTiming(
      1,
      { duration: DISMISS_DURATION, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onDismiss)();
      },
    );
  }

  function handlePress() {
    const node = tileRef.current;
    if (!node) {
      onPress({ x: 0, y: 0, width: 0, height: 0 });
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      onPress({ x, y, width, height });
    });
  }

  return (
    <Animated.View style={[styles.wrapper, outerDismissStyle]}>
      {/* Collapse wrap — height animates to 0 on dismiss so chat cards reflow
          up in sync. overflow:hidden clips the tile content as it shrinks. */}
      <Animated.View style={[styles.collapse, collapseStyle]}>
        <Pressable
          ref={tileRef}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel="Open House Rules"
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <View style={styles.houseWrap} pointerEvents="none">
            <HouseIllustration width={HOUSE_WIDTH} height={HOUSE_HEIGHT} color={Colors.skyBlue} />
          </View>

          <View style={styles.textBlock} pointerEvents="none">
            <Text style={styles.title}>House Rules</Text>
            <Text style={styles.subtitle}>TLDR: don&apos;t be shitty</Text>
          </View>

          <Pressable
            onPress={handleDismissPress}
            accessibilityRole="button"
            accessibilityLabel="Dismiss House Rules"
            hitSlop={12}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <CloseIcon size={24} color={Colors.white} />
          </Pressable>
        </Pressable>
      </Animated.View>

      {/* "Read me" badge — bleeds above the tile. Lives OUTSIDE the collapse
          wrap so it isn't clipped during normal display. Fades/scales with
          the outer wrap during dismiss. */}
      <View pointerEvents="none" style={styles.badgeWrap}>
        <Animated.View style={[styles.badge, badgeAnimatedStyle]}>
          <Text style={styles.badgeText}>Read me</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  // Clips the tile as `collapseStyle` shrinks its height to 0 on dismiss.
  collapse: {
    overflow: 'hidden',
  },
  tile: {
    height: TILE_HEIGHT,
    backgroundColor: Colors.blue,
    borderRadius: Radius.md, // 12
    overflow: 'visible',
  },
  pressed: {
    opacity: 0.92,
  },
  houseWrap: {
    position: 'absolute',
    left: HOUSE_LEFT,
    top: HOUSE_TOP,
    width: HOUSE_WIDTH,
    height: HOUSE_HEIGHT,
  },
  textBlock: {
    position: 'absolute',
    left: TEXT_LEFT,
    top: 35,
    right: 40,
  },
  title: {
    ...TextStyle.h3,
    color: Colors.white,
  },
  subtitle: {
    ...TextStyle.body,
    color: Colors.white,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrap: {
    position: 'absolute',
    top: -13,
    left: 7,
  },
  badge: {
    backgroundColor: Colors.magenta,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    // rotation + scale are driven by Reanimated; see badgeAnimatedStyle above.
  },
  badgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.black,
    letterSpacing: -0.64,
  },
});
