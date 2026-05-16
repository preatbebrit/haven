import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GenderAvatar, getAvatarColors, type GenderSymbol } from '@/components/ui/gender-avatar';
import { CheckIcon } from '@/components/ui/icons/check-icon';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  friend: {
    id: string;
    handle: string;
    pronouns: string;
    avatarSymbol: GenderSymbol;
  };
  selected: boolean;
  onToggle: () => void;
};

export function ShareFriendRow({ friend, selected, onToggle }: Props) {
  const { colors } = useTheme();
  const { bg, symbol } = getAvatarColors(friend.id);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.gray100 },
        pressed && { opacity: 0.7 },
      ]}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={
        selected
          ? `Stop sharing with @${friend.handle}`
          : `Share with @${friend.handle}`
      }
    >
      <View style={styles.left}>
        <GenderAvatar symbol={friend.avatarSymbol} size={32} bgColor={bg} symbolColor={symbol} />
        <View style={styles.info}>
          <Text style={[styles.handle, { color: colors.textPrimary }]} numberOfLines={1}>@{friend.handle}</Text>
          {friend.pronouns ? (
            <Text style={[styles.pronouns, { color: colors.textPrimary }]}>({friend.pronouns})</Text>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.checkbox,
          { borderColor: colors.gray80 },
          selected && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
        ]}
      >
        {selected ? <CheckIcon size={16} color={colors.textPrimaryInverted} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.gray100,
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  handle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.32,
    color: Colors.black,
  },
  pronouns: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.black,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.gray80,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxSelected: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
  },
});
