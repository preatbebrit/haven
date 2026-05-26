import { useLayoutEffect, type ComponentType, type ReactNode } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

import Copy from '@/assets/images/intro-2/copy.svg';
import Heart1 from '@/assets/images/intro-2/heart-1.svg';
import Heart2 from '@/assets/images/intro-2/heart-2.svg';
import Heart3 from '@/assets/images/intro-2/heart-3.svg';
import PromptAnswer from '@/assets/images/intro-2/prompt-answer.svg';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const facePng = require('@/assets/images/intro-2/face.png');

// Opacity + scale pop-in only. Rotation stays at restRotation throughout —
// no rotation spring, so pieces settle in place without a post-pop jiggle.
const SCALE_SPRING = { damping: 12, stiffness: 140, mass: 0.6 };
const OPACITY_MS = 220;
const STAGGER_MS = 70;

// Scale uniformly so the phone's right edge (figma x=403) lines up with the
// composition's right edge (320 wide). Composition height tracks the phone's
// bottom in figma (~414.7 * S).
const COMPOSITION_WIDTH = 320;
const FIGMA_CONTENT_WIDTH = 403; // phone right edge in figma coords
const S = COMPOSITION_WIDTH / FIGMA_CONTENT_WIDTH;
const COMPOSITION_HEIGHT = Math.ceil(414.7 * S) + 2;

// Face mask values in figma coords (from face.svg: 64×70 viewBox, the 320×480
// photo rendered at 165.296×247.945 offset (-48.66, -42.98)).
const FACE_VIEW_W = 64 * S;
const FACE_VIEW_H = 70 * S;
const FACE_IMG_W = 165.296 * S;
const FACE_IMG_H = 247.945 * S;
const FACE_IMG_X = -48.66 * S;
const FACE_IMG_Y = -42.98 * S;

type SvgPiece = {
  kind: 'svg';
  key: string;
  Component: ComponentType<SvgProps>;
  style: ViewStyle;
  fromRotation: number;
  restRotation: number;
  svgProps?: SvgProps;
};

type EmojiPiece = {
  kind: 'emoji';
  key: string;
  char: string;
  size: number;
  style: ViewStyle;
  fromRotation: number;
  restRotation: number;
};

type FacePiece = {
  kind: 'face';
  key: string;
  style: ViewStyle;
  fromRotation: number;
  restRotation: number;
};

type Piece = SvgPiece | EmojiPiece | FacePiece;

// Render back-to-front per the Figma JSX: headline behind, phone, then the
// small accents (plant/face/smiley/hearts) on top.
function buildPieces(copyColor: string): Piece[] {
  return [
    {
      kind: 'svg',
      key: 'copy',
      Component: Copy,
      style: { left: 0, top: 107 * S, width: 276 * S, height: 240 * S },
      fromRotation: 0,
      restRotation: 0,
      svgProps: { color: copyColor },
    },
    {
      kind: 'svg',
      key: 'prompt-answer',
      Component: PromptAnswer,
      // 7.43° tilt is baked into prompt-answer.svg, so restRotation is 0.
      style: {
        left: 185.83 * S,
        top: 25.31 * S,
        width: 217.34 * S,
        height: 389.39 * S,
      },
      fromRotation: 0,
      restRotation: 0,
    },
    {
      kind: 'emoji',
      key: 'plant',
      char: '🌱',
      size: 51 * S,
      style: { left: 0, top: 56 * S },
      fromRotation: 0,
      restRotation: 0,
    },
    {
      kind: 'face',
      key: 'face',
      style: { left: 52 * S, top: 45 * S, width: FACE_VIEW_W, height: FACE_VIEW_H },
      fromRotation: 0,
      restRotation: 0,
    },
    {
      kind: 'emoji',
      key: 'smiley',
      char: '😃',
      size: 51 * S,
      style: { left: 101 * S, top: 236 * S },
      fromRotation: 0,
      restRotation: 0,
    },
    {
      kind: 'svg',
      key: 'heart-1',
      Component: Heart1,
      style: {
        left: 57.55 * S,
        top: 106.11 * S,
        width: 25.69 * S,
        height: 25.48 * S,
      },
      fromRotation: -25.45,
      restRotation: -25.45,
    },
    {
      kind: 'svg',
      key: 'heart-2',
      Component: Heart2,
      style: {
        left: 301.31 * S + 20,
        top: 252.17 * S,
        width: 21.85 * S,
        height: 21.13 * S,
      },
      fromRotation: 10.93,
      restRotation: 10.93,
    },
    {
      kind: 'svg',
      key: 'heart-3',
      Component: Heart3,
      style: {
        left: 326 * S + 20,
        top: 228.81 * S,
        width: 14.53 * S,
        height: 14.1 * S,
      },
      fromRotation: -13.34,
      restRotation: -13.34,
    },
  ];
}

type Props = { active: boolean };

export function IntroCarousel2({ active }: Props) {
  const { colors } = useTheme();
  const pieces = buildPieces(colors.textPrimary);

  return (
    <View style={styles.host} pointerEvents="none">
      <View style={styles.composition}>
        {pieces.map((p, i) => (
          <PopIn
            key={p.key}
            active={active}
            delay={i * STAGGER_MS}
            restRotation={p.restRotation}
            style={p.style}
          >
            {p.kind === 'svg' ? (
              <p.Component width="100%" height="100%" {...(p.svgProps ?? {})} />
            ) : p.kind === 'emoji' ? (
              <Text
                style={{
                  fontFamily: FontFamily.semiBold,
                  fontSize: p.size,
                  lineHeight: p.size * 1.15,
                  includeFontPadding: false,
                }}
              >
                {p.char}
              </Text>
            ) : (
              <View style={styles.faceClip}>
                <Image source={facePng} style={styles.faceImage} />
              </View>
            )}
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
  faceClip: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  faceImage: {
    position: 'absolute',
    left: FACE_IMG_X,
    top: FACE_IMG_Y,
    width: FACE_IMG_W,
    height: FACE_IMG_H,
  },
});
