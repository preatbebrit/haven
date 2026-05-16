import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Spacing } from '@/constants/theme';

type Props = {
  chats: number;
  friends: number;
};

export function ProfileStatsCards({ chats, friends }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.card, { backgroundColor: Colors.blue }]}>
        <Text style={[styles.number, { color: Colors.skyBlue }]}>{chats}</Text>
        <Text style={styles.label}>Chats</Text>
      </View>
      <View style={[styles.card, { backgroundColor: Colors.purple }]}>
        <Text style={[styles.number, { color: Colors.green }]}>{friends}</Text>
        <Text style={styles.label}>Friends</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  card: {
    flex: 1,
    height: 120,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  number: {
    fontFamily: FontFamily.semiBold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -2.4,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.white,
  },
});
