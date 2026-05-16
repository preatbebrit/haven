import { useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { IdentityPill } from '@/components/ui/identity-pill';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  matched: string[];
  unmatched: string[];
};

/**
 * Wrap-layout row of identity pills clipped to two lines by default, with a
 * trailing "..." pill that reveals the rest on tap.
 *
 * Measurement strategy: first render lays out every pill while the container
 * is invisible (opacity 0). Each pill reports its `y` via onLayout; we group
 * indices by line, and if a third line is detected we set `cutoff` to one
 * less than the count of pills that fit in lines 1+2 (leaving room for "...").
 * After measurement the container fades in with the clipped view. Re-measures
 * happen only when the pill set itself changes.
 */
export function IdentityPillRow({ matched, unmatched }: Props) {
  const { colors } = useTheme();
  const pills = [
    ...matched.map((label) => ({ label, matched: true as const })),
    ...unmatched.map((label) => ({ label, matched: false as const })),
  ];
  const total = pills.length;

  const [expanded, setExpanded] = useState(false);
  const [cutoff, setCutoff] = useState<number | null>(null);
  const [measuring, setMeasuring] = useState(true);
  const ysRef = useRef<Map<number, number>>(new Map());

  // Reset when the pill set changes (e.g. user edits identities and matches
  // shift). The joined keys are cheap to diff vs storing arrays in deps.
  const matchedKey = matched.join('|');
  const unmatchedKey = unmatched.join('|');
  useEffect(() => {
    setExpanded(false);
    setCutoff(null);
    setMeasuring(true);
    ysRef.current = new Map();
  }, [matchedKey, unmatchedKey]);

  function handlePillLayout(index: number, e: LayoutChangeEvent) {
    if (!measuring) return;
    const y = Math.round(e.nativeEvent.layout.y);
    ysRef.current.set(index, y);
    if (ysRef.current.size < total) return;

    const linesByY = new Map<number, number[]>();
    for (let i = 0; i < total; i++) {
      const yy = ysRef.current.get(i);
      if (yy == null) continue;
      if (!linesByY.has(yy)) linesByY.set(yy, []);
      linesByY.get(yy)!.push(i);
    }
    const sortedYs = Array.from(linesByY.keys()).sort((a, b) => a - b);
    if (sortedYs.length > 2) {
      const inTwoLines =
        (linesByY.get(sortedYs[0]) ?? []).length +
        (linesByY.get(sortedYs[1]) ?? []).length;
      // Drop one pill to leave room for the "..." trigger. If the "..." pill
      // ends up narrower than the dropped pill, there'll be a small gap;
      // that's nicer than risking the trigger wrapping to a third line.
      setCutoff(Math.max(0, inTwoLines - 1));
    } else {
      setCutoff(null);
    }
    setMeasuring(false);
  }

  const collapsed = !expanded && cutoff != null;
  const showOverflowTrigger = collapsed;

  return (
    <View style={[styles.tags, measuring && styles.measuring]}>
      {pills.map((p, i) => {
        if (collapsed && i >= cutoff!) return null;
        return (
          <View
            key={`${p.matched ? 'm' : 'u'}-${p.label}-${i}`}
            onLayout={measuring ? (e) => handlePillLayout(i, e) : undefined}
          >
            {p.matched ? (
              <IdentityPill label={p.label} />
            ) : (
              <View style={[styles.tagPill, { borderColor: colors.gray80 }]}>
                <Text style={[styles.tagText, { color: colors.textPrimary }]}>
                  {p.label}
                </Text>
              </View>
            )}
          </View>
        );
      })}
      {showOverflowTrigger ? (
        <Pressable
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel={`Show ${total - cutoff!} more identit${total - cutoff! === 1 ? 'y' : 'ies'}`}
          style={({ pressed }) => [
            styles.tagPill,
            styles.overflowPill,
            { borderColor: colors.gray80 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.tagText, { color: colors.textPrimary }]}>···</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  measuring: {
    opacity: 0,
  },
  tagPill: {
    height: 32,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  overflowPill: {
    minWidth: 44,
  },
  tagText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.black,
    letterSpacing: -0.24,
  },
});
