import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaginationBar } from '@/components/house-rules/pagination-bar';
import { Rule01 } from '@/components/house-rules/rule-01';
import { Rule02 } from '@/components/house-rules/rule-02';
import { Rule03 } from '@/components/house-rules/rule-03';
import { Rule04 } from '@/components/house-rules/rule-04';
import { Rule05 } from '@/components/house-rules/rule-05';
import { HouseRulesTileVisual } from '@/components/home/house-rules-tile-visual';
import { CloseIcon } from '@/components/ui/icons/close-icon';
import { Colors, Radius } from '@/constants/theme';
import {
  clearHouseRulesTransitionSource,
  getHouseRulesTransitionSource,
  type HouseRulesTransitionSource,
} from '@/lib/house-rules-transition';

// Morph easing copied from app/prompt.tsx — keeps the open/close motion
// consistent across the app.
const ENTER_DURATION = 320;
const EXIT_DURATION = 280;
const MORPH_EASING = Easing.bezier(0.32, 0.72, 0, 1);

const BOUNCE_PINCH_AMOUNT = 0.08;
const ANTICIPATION_PINCH_DURATION = 90;
const ANTICIPATION_RELEASE_DURATION = 220;
const SNAP_PINCH_PEAK = 0.3;
const SNAP_PINCH_DURATION = 70;
const SNAP_SETTLE_DURATION = 200;
const SNAP_SETTLE_EASING = Easing.bezier(0.34, 1.45, 0.64, 1);

// Per-card background colors. Rules 3-5 are placeholders until built.
const CARD_BG = [
  Colors.blue,        // 01 — Be kind
  Colors.purple,      // 02 — h@ven is not a dating app
  Colors.lightPurple, // 03 — read the room
  Colors.teal,        // 04 — yourself
  Colors.magenta,     // 05 — remember that everyone is trying their best
] as const;

const CARD_COUNT = CARD_BG.length;

export default function HouseRulesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  useLocalSearchParams<{ source?: string }>();

  // Read source rect once and clear so a stale rect can't be reused.
  const [source] = useState<HouseRulesTransitionSource>(() => {
    const s = getHouseRulesTransitionSource();
    if (s) clearHouseRulesTransitionSource();
    return s;
  });
  const hasSource = source !== null;

  const progress = useSharedValue(hasSource ? 0 : 1);
  const bounce = useSharedValue(0);
  const [interactive, setInteractive] = useState(!hasSource);
  const isExitingRef = useRef(false);

  // Track active card index so each rule re-runs its entrance animation when
  // it swipes into view.
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      const idx = Math.round(e.contentOffset.x / screenW);
      runOnJS(setActiveIndex)(idx);
    },
  });

  useEffect(() => {
    if (!hasSource) return;
    bounce.value = withSequence(
      withTiming(1, {
        duration: ANTICIPATION_PINCH_DURATION,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(0, {
        duration: ANTICIPATION_RELEASE_DURATION,
        easing: Easing.out(Easing.cubic),
      }),
    );
    progress.value = withDelay(
      ANTICIPATION_PINCH_DURATION,
      withTiming(1, { duration: ENTER_DURATION, easing: MORPH_EASING }, (finished) => {
        if (finished) runOnJS(setInteractive)(true);
      }),
    );
  }, [hasSource, progress, bounce]);

  function handleBack() {
    if (isExitingRef.current) return;
    if (!hasSource) {
      router.back();
      return;
    }
    isExitingRef.current = true;
    setInteractive(false);
    cancelAnimation(progress);
    cancelAnimation(bounce);
    progress.value = withTiming(0, { duration: EXIT_DURATION, easing: MORPH_EASING });
    bounce.value = withSequence(
      withDelay(
        EXIT_DURATION - SNAP_PINCH_DURATION,
        withTiming(SNAP_PINCH_PEAK, {
          duration: SNAP_PINCH_DURATION,
          easing: Easing.out(Easing.quad),
        }),
      ),
      withTiming(
        0,
        { duration: SNAP_SETTLE_DURATION, easing: SNAP_SETTLE_EASING },
        (finished) => {
          if (finished) runOnJS(router.back)();
        },
      ),
    );
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSource]);

  // Background morph: paints brand-blue from tile rect → full screen.
  const containerStyle = useAnimatedStyle(() => {
    if (!source) {
      return { left: 0, top: 0, width: screenW, height: screenH, borderRadius: 0 };
    }
    const r = source.rect;
    const scale = 1 - bounce.value * BOUNCE_PINCH_AMOUNT;
    return {
      left: interpolate(progress.value, [0, 1], [r.x, 0]),
      top: interpolate(progress.value, [0, 1], [r.y, 0]),
      width: interpolate(progress.value, [0, 1], [r.width, screenW]),
      height: interpolate(progress.value, [0, 1], [r.height, screenH]),
      borderRadius: interpolate(progress.value, [0, 0.5, 1], [Radius.md, 28, 0]),
      transform: [{ scale }],
    };
  });

  // Carousel + chrome fade in once morph clears halfway.
  const contentStyle = useAnimatedStyle(() => ({
    opacity: hasSource ? interpolate(progress.value, [0.55, 1], [0, 1], 'clamp') : 1,
  }));

  // Tile visual lives inside the morph wrapper, sized at the source rect.
  // Visible at progress 0 (tile size), faded out by progress 0.4 (so the
  // rule content has space to fade in around 0.55). The fade reverses on exit,
  // turning the shrinking rect back into the actual tile by the time it lands.
  const tileVisualStyle = useAnimatedStyle(() => ({
    opacity: hasSource ? interpolate(progress.value, [0, 0.4], [1, 0], 'clamp') : 0,
  }));

  // Close button top: 16,59 in design (~12px below safe area).
  const closeTop = Math.max(insets.top + 12, 59);
  const paginationBottom = Math.max(insets.bottom + 24, 54);

  return (
    <View style={styles.flex}>
      <StatusBar style="light" />

      {/* Morph background — paints brand-blue from tile rect to full screen.
          Houses the tile visual at top-left so the shrinking rect *becomes*
          the actual tile (house illo, badge, title) when it lands. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.morph, containerStyle, { backgroundColor: Colors.blue }]}
      >
        {hasSource && source ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.tileVisualPin,
              { width: source.rect.width, height: source.rect.height },
              tileVisualStyle,
            ]}
          >
            <HouseRulesTileVisual height={source.rect.height} />
          </Animated.View>
        ) : null}
      </Animated.View>

      {/* Carousel + chrome */}
      <Animated.View
        style={[styles.contentLayer, contentStyle]}
        pointerEvents={interactive ? 'box-none' : 'none'}
      >
        <Animated.ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          decelerationRate="fast"
          bounces={false}
          style={styles.scroll}
        >
          {/* Card 01 — Be kind */}
          <View style={[styles.card, { width: screenW, backgroundColor: CARD_BG[0] }]}>
            <Rule01 active={interactive && activeIndex === 0} />
          </View>

          {/* Card 02 — h@ven is not a dating app */}
          <View style={[styles.card, { width: screenW, backgroundColor: CARD_BG[1] }]}>
            <Rule02 active={interactive && activeIndex === 1} />
          </View>

          {/* Card 03 — read the room */}
          <View style={[styles.card, { width: screenW, backgroundColor: CARD_BG[2] }]}>
            <Rule03 active={interactive && activeIndex === 2} />
          </View>

          {/* Card 04 — yourself */}
          <View style={[styles.card, { width: screenW, backgroundColor: CARD_BG[3] }]}>
            <Rule04 active={interactive && activeIndex === 3} />
          </View>

          {/* Card 05 — remember everyone is trying their best */}
          <View style={[styles.card, { width: screenW, backgroundColor: CARD_BG[4] }]}>
            <Rule05 active={interactive && activeIndex === 4} />
          </View>
        </Animated.ScrollView>

        {/* Close button — fixed at top-left, single instance for all cards */}
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Close House Rules"
          hitSlop={12}
          style={[styles.closeButton, { top: closeTop }]}
        >
          <CloseIcon size={24} color={Colors.white} />
        </Pressable>

        {/* Pagination — tracks the active card */}
        <View
          pointerEvents="none"
          style={[styles.paginationWrap, { bottom: paginationBottom }]}
        >
          <PaginationBar count={CARD_COUNT} active={activeIndex} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  morph: {
    position: 'absolute',
    overflow: 'hidden',
  },
  tileVisualPin: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  contentLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scroll: {
    flex: 1,
  },
  card: {
    flex: 1,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  paginationWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
