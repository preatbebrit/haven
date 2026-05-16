import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  /** Right-aligned value text (e.g. "On", "They/them"). Hidden when undefined. */
  value?: string;
  /** Suppresses the chevron and disables press feedback. */
  readOnly?: boolean;
  /** Renders the row as disabled (greyed out, not pressable). */
  disabled?: boolean;
  /** Renders the label in cherry red (Sign out, Delete account). */
  destructive?: boolean;
  /** Custom right slot — overrides value + chevron. */
  rightSlot?: ReactNode;
  onPress?: () => void;
};

export function SettingsRow({
  label,
  value,
  readOnly,
  disabled,
  destructive,
  rightSlot,
  onPress,
}: Props) {
  const { colors } = useTheme();
  const showChevron = !readOnly && !disabled && !rightSlot && Boolean(onPress);
  const interactive = !disabled && !readOnly && Boolean(onPress);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.gray80 },
        disabled && styles.rowDisabled,
        interactive && pressed && styles.rowPressed,
      ]}
      onPress={interactive ? onPress : undefined}
      disabled={!interactive}
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.label,
          { color: colors.textPrimary },
          destructive && styles.labelDestructive,
          disabled && styles.labelDisabled,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>

      {rightSlot ? (
        <View style={styles.rightSlot}>{rightSlot}</View>
      ) : value !== undefined ? (
        <Text
          style={[
            styles.value,
            { color: colors.textSecondary },
            disabled && styles.valueDisabled,
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}

      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={Colors.gray60} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  label: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.32,
  },
  labelDestructive: {
    color: Colors.cherry,
  },
  labelDisabled: {
    color: Colors.gray60,
  },
  value: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    maxWidth: '55%',
    textAlign: 'right',
  },
  valueDisabled: {
    color: Colors.gray60,
  },
  rightSlot: {
    flexShrink: 0,
  },
});
