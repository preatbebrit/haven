import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, FontFamily } from '@/constants/theme';

// Figma node 341:9634 — 24×24 cherry circle, black ExtraBold text, no border.
type Size = 'sm' | 'md';

type Props = {
  count: number;
  size?: Size;
  style?: StyleProp<ViewStyle>;
};

export function CountBadge({ count, size = 'sm', style }: Props) {
  if (count <= 0) return null;
  const label = count > 9 ? '9+' : String(count);
  const isMd = size === 'md';

  return (
    <View
      style={[
        styles.base,
        isMd ? styles.md : styles.sm,
        style,
      ]}
      pointerEvents="none"
      accessible
      accessibilityLabel={`${count} new`}
    >
      <Text style={[styles.text, isMd ? styles.textMd : styles.textSm]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.magenta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
  },
  md: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
  },
  text: {
    fontFamily: FontFamily.extraBold,
    color: Colors.black,
    textAlign: 'center',
    includeFontPadding: false,
    letterSpacing: -0.24,
  },
  textSm: {
    fontSize: 12,
    lineHeight: 16,
  },
  textMd: {
    fontSize: 14,
    lineHeight: 18,
  },
});
