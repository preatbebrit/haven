import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Spacing } from '@/constants/theme';

type Props = {
  title?: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: Props) {
  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.gray60,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  body: {
    paddingHorizontal: Spacing.md,
  },
});
