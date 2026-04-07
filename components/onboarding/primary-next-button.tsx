import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';

type Props = {
  label?: string;
  disabled?: boolean;
  onPress: () => void;
};

export function PrimaryNextButton({ label = 'Next', disabled, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        disabled && styles.btnDisabled,
        !disabled && pressed && styles.btnPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
      <Ionicons
        name="arrow-forward"
        size={20}
        color={disabled ? 'rgba(255,255,255,0.85)' : Colors.white}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: Colors.black,
    borderRadius: Radius.lg,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  btnDisabled: {
    backgroundColor: Colors.gray80,
  },
  btnPressed: {
    opacity: 0.9,
  },
  label: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  labelDisabled: {
    color: Colors.white,
  },
});
