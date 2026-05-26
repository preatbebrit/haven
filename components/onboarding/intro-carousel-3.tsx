import { useLayoutEffect, type ComponentType, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

import AtSymbol from '@/assets/images/intro-3/at-symbol.svg';
import Chat from '@/assets/images/intro-3/chat.svg';
import User1 from '@/assets/images/intro-3/user-1.svg';
import User2 from '@/assets/images/intro-3/user-2.svg';
import User3 from '@/assets/images/intro-3/user-3.svg';

// Opacity fades in, scale springs from 0.6 → 1. No rotation animation —
// pieces appear at their resting tilt with no post-pop wobble.
const SCALE_SPRING = { damping: 12, stiffness: 140, mass: 0.6 };
const OPACITY_MS = 220;
const STAGGER_MS = 70;

// Figma frame "Tutorial Image 3" is 361×440, scaled to 320 wide.
const COMPOSITION_WIDTH = 320;
const S = COMPOSITION_WIDTH / 361;
const COMPOSITION_HEIGHT = 365;

// at-symbol SVG has no baked-in rotation, so we rotate it in RN. Position the
// View at the natural (unrotated) SVG dims, centered inside the figma
// wrapper's rotated bounding box — that way -6° rotation fills the wrapper.
const AT_WRAPPER_X = 26.58 * S;
const AT_WRAPPER_Y = 80.5 * S;
const AT_WRAPPER_W = 291.82 * S;
const AT_WRAPPER_H = 291.77 * S;
const AT_SVG_W = 265 * S;
const AT_SVG_H = 266 * S;
const AT_X = AT_WRAPPER_X + (AT_WRAPPER_W - AT_SVG_W) / 2;
const AT_Y = AT_WRAPPER_Y + (AT_WRAPPER_H - AT_SVG_H) / 2;

type Piece = {
  key: string;
  Component: ComponentType<SvgProps>;
  style: ViewStyle;
  restRotation: number;
};

// Render back-to-front per the Figma JSX: at-symbol background, then the
// chat, then the floating user pills.
const PIECES: Piece[] = [
  {
    key: 'at-symbol',
    Component: AtSymbol,
    style: { left: AT_X, top: AT_Y, width: AT_SVG_W, height: AT_SVG_H },
    restRotation: -6,
  },
  {
    key: 'chat',
    // -12.65° tilt is baked into chat.svg, so restRotation is 0.
    Component: Chat,
    style: {
      left: 63.75 * S,
      top: 32.09 * S,
      width: 233.51 * S,
      height: 375.82 * S,
    },
    restRotation: 0,
  },
  {
    key: 'user-1',
    Component: User1,
    style: { left: 16 * S, top: 94 * S, width: 152 * S, height: 48 * S },
    restRotation: 0,
  },
  {
    key: 'user-3',
    Component: User3,
    style: { left: 176 * S, top: 304 * S, width: 148 * S, height: 48 * S },
    restRotation: 0,
  },
  {
    key: 'user-2',
    Component: User2,
    style: { left: 176 * S, top: 160 * S, width: 177 * S, height: 48 * S },
    restRotation: 0,
  },
];

type Props = { active: boolean };

export function IntroCarousel3({ active }: Props) {
  return (
    <View style={styles.host} pointerEvents="none">
      <View style={styles.composition}>
        {PIECES.map((p, i) => (
          <PopIn
            key={p.key}
            active={active}
            delay={i * STAGGER_MS}
            restRotation={p.restRotation}
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
  restRotation: number;
  style: ViewStyle;
  children: ReactNode;
};

function PopIn({ active, delay, restRotation, style, children }: PopInProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);

  // useLayoutEffect runs synchronously after render, before paint — so the
  // animation is queued before the first visible frame and starts instantly.
  useLayoutEffect(() => {
    if (active) {
      opacity.value = withDelay(delay, withTiming(1, { duration: OPACITY_MS }));
      scale.value = withDelay(delay, withSpring(1, SCALE_SPRING));
    } else {
      opacity.value = 0;
      scale.value = 0.6;
    }
  }, [active, delay, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${restRotation}deg` }],
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
