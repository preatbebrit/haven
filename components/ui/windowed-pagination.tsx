import { useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

const BAR_GAP = 8;
const BAR_HEIGHT = 4;
const FADE_WIDTH_BARS = 1.5;
/** Active bar's width as a multiple of an inactive bar's width. */
const ACTIVE_WIDTH_SCALE = 1.6;

type Props = {
  /** Total number of conceptual bars (e.g. 20). */
  count: number;
  /** Continuous active position in [0, count). Each swipe should change this
   *  by ±1 so every swipe causes visible motion. */
  position: SharedValue<number>;
  /** Maximum number of bars visible at any time. Cap on visual density. */
  visibleCount: number;
  /** Background color behind the bars — used for the edge fade gradient so
   *  the bars appear to fade INTO the page rather than over a colored wash. */
  backgroundColor: string;
  style?: ViewStyle | ViewStyle[];
};

/**
 * A sliding-window progress indicator with consistent gaps between every
 * bar. The active bar is longer than the inactive ones; bars after the
 * active position are dynamically shifted to make room, so the gap between
 * any two adjacent bars stays exactly `BAR_GAP` regardless of where the
 * highlight is.
 *
 * The strip slides horizontally so the active bar stays near the middle of
 * the visible window. Edge fades on each side imply more bars beyond what's
 * shown.
 */
export function WindowedPagination({
  count,
  position,
  visibleCount,
  backgroundColor,
  style,
}: Props) {
  const { colors } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  const visible = Math.max(1, Math.min(visibleCount, count));

  // Bar widths are sized so the visible window holds `visible - 1` inactive
  // bars and 1 active bar (since exactly one bar is active at a time the
  // window can fit a constant number of bars).
  const barWidth =
    containerWidth > 0
      ? (containerWidth - (visible - 1) * BAR_GAP) /
        (visible - 1 + ACTIVE_WIDTH_SCALE)
      : 0;
  const deltaWidth = barWidth * (ACTIVE_WIDTH_SCALE - 1);
  const stride = barWidth + BAR_GAP;
  // Total strip width is constant because total bar-growth across the whole
  // strip is always exactly `deltaWidth` (sum of all per-bar weights is 1).
  const stripWidth = count * barWidth + (count - 1) * BAR_GAP + deltaWidth;

  const stripStyle = useAnimatedStyle(() => {
    // Visual center of the active highlight in strip coordinates. Linearly
    // interpolates between adjacent bar centers as `position` slides.
    const activeCenter = position.value * stride + barWidth / 2 + deltaWidth / 2;
    const desiredLeft = activeCenter - containerWidth / 2;
    const maxLeft = Math.max(0, stripWidth - containerWidth);
    const stripLeft = Math.max(0, Math.min(maxLeft, desiredLeft));
    return { transform: [{ translateX: -stripLeft }] };
  });

  const fadeWidth = Math.max(0, FADE_WIDTH_BARS * stride - BAR_GAP);
  // Edge-fade intensity: matches how much strip is hidden beyond each side.
  const maxLeftStrip = Math.max(0, stripWidth - containerWidth);

  return (
    <View
      style={[styles.root, style]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w !== containerWidth) setContainerWidth(w);
      }}
    >
      {containerWidth > 0 ? (
        <Animated.View
          style={[styles.strip, { width: stripWidth }, stripStyle]}
          pointerEvents="none"
        >
          {Array.from({ length: count }).map((_, i) => (
            <Bar
              key={i}
              index={i}
              baseWidth={barWidth}
              deltaWidth={deltaWidth}
              stride={stride}
              position={position}
              inactiveColor={colors.gray80}
              activeColor={colors.textPrimary}
            />
          ))}
        </Animated.View>
      ) : null}

      {containerWidth > 0 && maxLeftStrip > 0 ? (
        <>
          <EdgeFade
            side="left"
            width={fadeWidth}
            height={BAR_HEIGHT}
            backgroundColor={backgroundColor}
            position={position}
            stride={stride}
            barWidth={barWidth}
            deltaWidth={deltaWidth}
            containerWidth={containerWidth}
            maxLeftStrip={maxLeftStrip}
          />
          <EdgeFade
            side="right"
            width={fadeWidth}
            height={BAR_HEIGHT}
            backgroundColor={backgroundColor}
            position={position}
            stride={stride}
            barWidth={barWidth}
            deltaWidth={deltaWidth}
            containerWidth={containerWidth}
            maxLeftStrip={maxLeftStrip}
          />
        </>
      ) : null}
    </View>
  );
}

function Bar({
  index,
  baseWidth,
  deltaWidth,
  stride,
  position,
  inactiveColor,
  activeColor,
}: {
  index: number;
  baseWidth: number;
  deltaWidth: number;
  stride: number;
  position: SharedValue<number>;
  inactiveColor: string;
  activeColor: string;
}) {
  // Each bar's width grows smoothly as the active highlight approaches it,
  // and shrinks back to baseWidth as it leaves. Each bar's `left` is the
  // cumulative width + gap of every preceding bar — so bars after the active
  // position naturally shift to make room for the wider active bar, keeping
  // the gap between adjacent bars constant at BAR_GAP.
  const animStyle = useAnimatedStyle(() => {
    const myWeight = Math.max(0, 1 - Math.abs(position.value - index));
    const width = baseWidth + deltaWidth * myWeight;

    let cumGrowth = 0;
    for (let k = 0; k < index; k++) {
      const w_k = Math.max(0, 1 - Math.abs(position.value - k));
      cumGrowth += deltaWidth * w_k;
    }
    const left = index * stride + cumGrowth;

    const backgroundColor = interpolateColor(
      myWeight,
      [0, 1],
      [inactiveColor, activeColor],
    );
    return { left, width, backgroundColor };
  });
  return <Animated.View style={[styles.bar, animStyle]} />;
}

function EdgeFade({
  side,
  width,
  height,
  backgroundColor,
  position,
  stride,
  barWidth,
  deltaWidth,
  containerWidth,
  maxLeftStrip,
}: {
  side: 'left' | 'right';
  width: number;
  height: number;
  backgroundColor: string;
  position: SharedValue<number>;
  stride: number;
  barWidth: number;
  deltaWidth: number;
  containerWidth: number;
  maxLeftStrip: number;
}) {
  // Fade intensity tracks how much strip is hidden on this side — full when
  // there are bars beyond the visible window, fading to none at the strip's
  // natural extremes (so the active bar never sits behind a fade overlay at
  // the start or end of the deck).
  const opacityStyle = useAnimatedStyle(() => {
    const activeCenter = position.value * stride + barWidth / 2 + deltaWidth / 2;
    const desiredLeft = activeCenter - containerWidth / 2;
    const stripLeft = Math.max(0, Math.min(maxLeftStrip, desiredLeft));
    const intensity =
      side === 'left'
        ? Math.min(1, stripLeft / stride)
        : Math.min(1, (maxLeftStrip - stripLeft) / stride);
    return { opacity: intensity };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.edgeFade,
        side === 'left' ? { left: 0 } : { right: 0 },
        { width, height },
        opacityStyle,
      ]}
    >
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`fade-${side}`} x1="0" y1="0" x2="1" y2="0">
            <Stop
              offset="0"
              stopColor={backgroundColor}
              stopOpacity={side === 'left' ? 1 : 0}
            />
            <Stop
              offset="1"
              stopColor={backgroundColor}
              stopOpacity={side === 'left' ? 0 : 1}
            />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#fade-${side})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    overflow: 'hidden',
    height: BAR_HEIGHT,
    justifyContent: 'center',
  },
  strip: {
    position: 'relative',
    height: BAR_HEIGHT,
  },
  bar: {
    position: 'absolute',
    top: 0,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
  },
  edgeFade: {
    position: 'absolute',
    top: 0,
  },
});
