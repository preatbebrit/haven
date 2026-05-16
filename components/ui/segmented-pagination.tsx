import { useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

const BAR_GAP = 4;

type Props = {
  count: number;
  /** Continuous index in [0, count). The active bar grows wider and darkens as `progress` lands on it. */
  progress: SharedValue<number>;
  /** Optional container style override (padding, alignment). */
  style?: ViewStyle | ViewStyle[];
};

/**
 * Animated segmented progress indicator. Bars share total width via flex
 * weights derived from how close `progress` is to each index, and color
 * interpolates from gray80 (inactive) to black (active).
 *
 * Used by `app/answers.tsx` (chat prompt answers) and the friend profile
 * prompt deck so they share the same pagination treatment.
 */
export function SegmentedPagination({ count, progress, style }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const available = Math.max(0, width - (count - 1) * BAR_GAP);
  return (
    <View
      style={[styles.row, style]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w !== width) setWidth(w);
      }}
    >
      {available > 0
        ? Array.from({ length: count }).map((_, i) => (
            <PaginationBar
              key={i}
              index={i}
              count={count}
              available={available}
              progress={progress}
              inactiveColor={colors.gray80}
              activeColor={colors.textPrimary}
            />
          ))
        : null}
    </View>
  );
}

function PaginationBar({
  index,
  count,
  available,
  progress,
  inactiveColor,
  activeColor,
}: {
  index: number;
  count: number;
  available: number;
  progress: SharedValue<number>;
  inactiveColor: string;
  activeColor: string;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    let totalFlex = 0;
    const flexes: number[] = [];
    for (let i = 0; i < count; i++) {
      const weight = Math.max(0, 1 - Math.abs(progress.value - i));
      const flex = 1 + 2 * weight;
      flexes.push(flex);
      totalFlex += flex;
    }
    const barWidth = (flexes[index] / totalFlex) * available;
    const myWeight = Math.max(0, 1 - Math.abs(progress.value - index));
    const bg = interpolateColor(myWeight, [0, 1], [inactiveColor, activeColor]);
    return { width: barWidth, backgroundColor: bg };
  });
  return <Animated.View style={[styles.segment, animatedStyle]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BAR_GAP,
  },
  segment: {
    height: 4,
    borderRadius: 2,
  },
});
