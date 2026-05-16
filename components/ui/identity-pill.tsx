import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
};

const STROKE_WIDTH = 1;

export function IdentityPill({ label }: Props) {
  const { colors } = useTheme();
  const [layout, setLayout] = useState<{ w: number; h: number } | null>(null);
  const gradientId = `identity-pill-${label.replace(/\s+/g, '-')}`;

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!layout || layout.w !== width || layout.h !== height) {
          setLayout({ w: width, h: height });
        }
      }}
    >
      <View style={[styles.pill, { backgroundColor: colors.backgroundPrimary }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      </View>
      {/* Gradient stroke is rendered as an absolutely-positioned sibling (not a
          child of the rounded pill View) so iOS's implicit cornerRadius clipping
          can't shave the top/bottom of the stroke where the curve is steepest. */}
      {layout && (() => {
        const inset = STROKE_WIDTH / 2;
        const maxR = Math.min(layout.w, layout.h) / 2;
        const cornerR = Math.max(0, Math.min(Radius.lg, maxR) - inset);
        return (
          <Svg
            style={StyleSheet.absoluteFill}
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
                <Stop offset="1" stopColor={Colors.lightPurple} />
              </LinearGradient>
            </Defs>
            <Rect
              x={inset}
              y={inset}
              width={Math.max(0, layout.w - STROKE_WIDTH)}
              height={Math.max(0, layout.h - STROKE_WIDTH)}
              rx={cornerR}
              ry={cornerR}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={STROKE_WIDTH}
            />
          </Svg>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // Outer wrapper has no borderRadius, so the sibling SVG stroke isn't
    // clipped by the pill's rounded shape on iOS.
    alignSelf: 'flex-start',
  },
  pill: {
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    color: Colors.black,
  },
});
