import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing, TextStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  body: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
};

export function EmptyState({ title, body, ctaLabel, onCtaPress }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
      {ctaLabel && onCtaPress ? (
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.buttonPrimary },
            pressed && { opacity: 0.85 },
          ]}
          onPress={onCtaPress}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <Text style={[styles.btnLabel, { color: colors.textPrimaryInverted }]}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...TextStyle.h3,
    color: Colors.black,
    textAlign: 'center',
  },
  body: {
    ...TextStyle.body,
    color: Colors.gray40,
    textAlign: 'center',
  },
  btn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.black,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  btnLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.white,
    letterSpacing: -0.32,
  },
});
