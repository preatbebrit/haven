import { useId, useState } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Colors } from '@/constants/theme';

type Props = {
  active: boolean;
  /** Border radius of the parent tile. */
  radius?: number;
  /** Stroke width of the gradient border. */
  strokeWidth?: number;
};

export function FriendTileGlow({ active, radius = 20, strokeWidth = 2 }: Props) {
  const [layout, setLayout] = useState<{ w: number; h: number } | null>(null);
  const reactId = useId();
  const gradientId = `friend-tile-glow-${reactId.replace(/[^a-zA-Z0-9-]/g, '')}`;

  if (!active) return null;

  // absoluteFill insets inside the parent's border, which leaves a visible gap
  // between the gray base border and the gradient highlight. Extending outward
  // by `strokeWidth` makes the wrapper cover the parent's border area too, so
  // the gradient stroke sits directly on top of it. Assumes the parent's
  // borderWidth equals this glow's strokeWidth (true for all current callers).
  return (
    <View
      style={{
        position: 'absolute',
        top: -strokeWidth,
        left: -strokeWidth,
        right: -strokeWidth,
        bottom: -strokeWidth,
      }}
      pointerEvents="none"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!layout || layout.w !== width || layout.h !== height) {
          setLayout({ w: width, h: height });
        }
      }}
    >
      {layout && (
        <Svg
          width={layout.w}
          height={layout.h}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient
              id={gradientId}
              x1={0}
              y1={0}
              x2={0}
              y2={layout.h}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={Colors.cherry} />
              <Stop offset="1" stopColor={Colors.magenta} />
            </LinearGradient>
          </Defs>
          <Rect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={Math.max(0, layout.w - strokeWidth)}
            height={Math.max(0, layout.h - strokeWidth)}
            rx={Math.max(0, radius - strokeWidth / 2)}
            ry={Math.max(0, radius - strokeWidth / 2)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
          />
        </Svg>
      )}
    </View>
  );
}
