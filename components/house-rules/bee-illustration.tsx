import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

type Props = {
  width?: number;
  height?: number;
  color?: string;
  /**
   * 0 = wings at rest, 1 = wings fully flapped (rotated outward from base).
   * Loop between 0 and 1 to simulate flapping. The stinger also reacts with a
   * gentle scaleX wiggle.
   */
  flap?: SharedValue<number>;
};

// Inlined from Figma node 615:13945 (House Rules 4). Top-down bee:
//   - HEAD: big filled circle on left (STATIC)
//   - BODY: 2 vertical stripes + inner side curves (STATIC)
//   - WINGS: 2 tilted stroked ovals on top (ANIMATED — rotate outward from
//     their inner-base corner)
//   - STINGER: small triangle on right (ANIMATED — gentle scaleX wiggle)
//
// Each animated element lives in its own wrapper View that is *bounded so its
// corner sits at the rotation pivot* — that lets us use the well-supported
// transformOrigin keywords ('right bottom', 'left bottom', 'left center')
// instead of percentage origins, which are unreliable on Animated.View.
const NATURAL_W = 222;
const NATURAL_H = 158.28;

// Wing bounding boxes in natural coords (with padding for the 9px stroke).
// The wrap is then SHRUNK on the inside so its inner corner lands at the
// wing's base; the SVG inside is full-bee-sized and offset to draw the wing
// at its natural position. overflow:visible lets the wing render outside the
// wrap bounds.
const LEFT_WING_BASE = { x: 118, y: 50 };   // where left wing meets body
const RIGHT_WING_BASE = { x: 149, y: 50 };  // where right wing meets body
const STINGER_BASE = { x: 206.25, y: 112.642 };

const WING_MAX_DEG = 22;

export function BeeIllustration({
  width = NATURAL_W,
  height = NATURAL_H,
  color = Colors.black,
  flap,
}: Props) {
  const sx = width / NATURAL_W;
  const sy = height / NATURAL_H;

  // Wings rotate outward from their base. Left rotates CCW, right rotates CW.
  const leftWingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(flap?.value ?? 0) * -WING_MAX_DEG}deg` }],
  }));
  const rightWingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(flap?.value ?? 0) * WING_MAX_DEG}deg` }],
  }));
  // Stinger does a gentle scaleX wiggle — pivots from its left edge.
  const stingerStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 - (flap?.value ?? 0) * 0.4 }],
  }));

  // Helper: render a part by wrapping a full-bee SVG inside an Animated.View
  // that's sized so its `pivotCorner` corner sits at (base.x, base.y).
  return (
    <View style={{ width, height }}>
      {/* ── Static body: head + stripes + inner curves ───────────────────── */}
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${NATURAL_W} ${NATURAL_H}`}
        fill="none"
        style={StyleSheet.absoluteFill}
      >
        {/* Body stripes + inner side curves */}
        <Path
          d="M154 66.0037C159.984 66.8044 165.687 68.1466 171 69.9548V154.329C165.687 156.137 159.984 157.479 154 158.28V66.0037ZM127 158.142C121.005 157.275 115.301 155.864 110 153.984V70.2996C115.301 68.4197 121.005 67.0085 127 66.1414V158.142ZM198 86.5037C204.957 93.8771 209 102.683 209 112.142C209 121.601 204.956 130.407 198 137.78V86.5037ZM83 136.687C76.6578 129.543 73 121.138 73 112.142C73 103.146 76.6575 94.7406 83 87.5964V136.687Z"
          fill={color}
        />
        {/* HEAD — STATIC */}
        <Circle cx={31.5} cy={91.6423} r={31.5} fill={color} />
      </Svg>

      {/* ── LEFT WING — wrap's right-bottom corner sits at the wing base ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            width: LEFT_WING_BASE.x * sx,
            height: LEFT_WING_BASE.y * sy,
            transformOrigin: 'right bottom',
            overflow: 'visible',
          },
          leftWingStyle,
        ]}
      >
        {/* Full-bee SVG so the wing renders at its natural coords; overflow on
            the wrap is visible so the wing extends below/right of the wrap. */}
        <Svg width={width} height={height} viewBox={`0 0 ${NATURAL_W} ${NATURAL_H}`}>
          <Path
            d="M99.4174 10.3858C101.471 9.51557 104.618 9.83233 108.467 12.62C112.236 15.3492 116 20.0441 118.589 26.1556C121.179 32.267 121.934 38.237 121.274 42.8429C120.599 47.5473 118.638 50.0285 116.584 50.8988C114.53 51.7691 111.383 51.4523 107.534 48.6647C103.766 45.9354 100.002 41.2405 97.4121 35.1291C94.8225 29.0177 94.0676 23.0476 94.7279 18.4418C95.4023 13.7374 97.3636 11.2561 99.4174 10.3858Z"
            stroke={color}
            strokeWidth={9}
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* ── RIGHT WING — wrap's left-bottom corner sits at the wing base ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: RIGHT_WING_BASE.x * sx,
            top: 0,
            width: (NATURAL_W - RIGHT_WING_BASE.x) * sx,
            height: RIGHT_WING_BASE.y * sy,
            transformOrigin: 'left bottom',
            overflow: 'visible',
          },
          rightWingStyle,
        ]}
      >
        {/* SVG offset so the wing draws at its natural position. */}
        <Svg
          width={width}
          height={height}
          viewBox={`0 0 ${NATURAL_W} ${NATURAL_H}`}
          style={{
            position: 'absolute',
            left: -RIGHT_WING_BASE.x * sx,
            top: 0,
          }}
        >
          <Path
            d="M166.585 10.3858C164.531 9.51557 161.384 9.83233 157.535 12.62C153.766 15.3492 150.002 20.0441 147.413 26.1556C144.823 32.267 144.068 38.237 144.728 42.8429C145.403 47.5473 147.364 50.0285 149.418 50.8988C151.472 51.7691 154.619 51.4523 158.468 48.6647C162.236 45.9354 166 41.2405 168.59 35.1291C171.179 29.0177 171.934 23.0476 171.274 18.4418C170.6 13.7374 168.638 11.2561 166.585 10.3858Z"
            stroke={color}
            strokeWidth={9}
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* ── STINGER — wrap's left-center sits at the stinger base ───────── */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: STINGER_BASE.x * sx,
            top: (STINGER_BASE.y - 12) * sy, // small vertical pad
            width: (NATURAL_W - STINGER_BASE.x) * sx,
            height: 24 * sy,
            transformOrigin: 'left center',
            overflow: 'visible',
          },
          stingerStyle,
        ]}
      >
        <Svg
          width={width}
          height={height}
          viewBox={`0 0 ${NATURAL_W} ${NATURAL_H}`}
          style={{
            position: 'absolute',
            left: -STINGER_BASE.x * sx,
            top: -(STINGER_BASE.y - 12) * sy,
          }}
        >
          <Path
            d="M222 112.642L206.25 121.736V103.549L222 112.642Z"
            fill={color}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
