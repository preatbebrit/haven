import { useLayoutEffect, type ComponentType } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

import Chat1 from '@/assets/images/intro-1/chat-1.svg';
import Chat2 from '@/assets/images/intro-1/chat-2.svg';
import Tag1 from '@/assets/images/intro-1/tag-1.svg';
import Tag2 from '@/assets/images/intro-1/tag-2.svg';

// Opacity fades in, scale springs from 0.6 → 1. No rotation animation —
// each SVG already carries its resting tilt baked in, so pieces appear at
// that tilt without any post-pop wobble.
const SCALE_SPRING = { damping: 12, stiffness: 140, mass: 0.6 };
const OPACITY_MS = 220;
const STAGGER_MS = 90;

// Logical box matches the Figma frame's 357×438 aspect, scaled by 0.897 to
// land on a 320-wide composition. Pieces are absolutely positioned using
// figma coordinates (top-left of each piece's bounding box including the
// SVG's shadow bleed) at the same scale.
const COMPOSITION_WIDTH = 320;
const COMPOSITION_HEIGHT = 392;

type Piece = {
  key: string;
  Component: ComponentType<SvgProps>;
  style: ViewStyle;
};

// Render order is back-to-front: chat-1 sits behind chat-2's left edge;
// the floating Nonbinary/Out tags overlay both cards.
const PIECES: Piece[] = [
  {
    key: 'chat-1',
    Component: Chat1,
    style: { top: 13, left: 7, width: 218, height: 310 },
  },
  {
    key: 'chat-2',
    Component: Chat2,
    style: { top: 139, left: 154, width: 160, height: 242 },
  },
  {
    key: 'tag-1',
    Component: Tag1,
    style: { top: 65, left: 176, width: 84, height: 40 },
  },
  {
    key: 'tag-2',
    Component: Tag2,
    style: { top: 66, left: 260, width: 47, height: 40 },
  },
];

type Props = { active: boolean };

export function IntroCarousel1({ active }: Props) {
  return (
    <View style={styles.host} pointerEvents="none">
      <View style={styles.composition}>
        {PIECES.map((p, i) => (
          <PopIn
            key={p.key}
            active={active}
            delay={i * STAGGER_MS}
            style={p.style}
          >
            <p.Component width="100%" height="100%" />
          </PopIn>
        ))}
      </View>
    </View>
  );
}

type PopInProps = {
  active: boolean;
  delay: number;
  style: ViewStyle;
  children: React.ReactNode;
};

function PopIn({ active, delay, style, children }: PopInProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);

  // useLayoutEffect runs synchronously after render, before paint — so the
  // animation is queued before the first visible frame and starts instantly.
  useLayoutEffect(() => {
    if (active) {
      opacity.value = withDelay(delay, withTiming(1, { duration: OPACITY_MS }));
      scale.value = withDelay(delay, withSpring(1, SCALE_SPRING));
    } else {
      // Snap back to starting pose so the next time `active` flips true the
      // animation replays from the beginning.
      opacity.value = 0;
      scale.value = 0.6;
    }
  }, [active, delay, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles.piece, style, animatedStyle]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composition: {
    width: COMPOSITION_WIDTH,
    height: COMPOSITION_HEIGHT,
    position: 'relative',
  },
  piece: {
    position: 'absolute',
  },
});
