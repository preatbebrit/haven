import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GenderAvatar, getAvatarColors, type GenderSymbol } from '@/components/ui/gender-avatar';
import { ChatIcon } from '@/components/ui/icons/chat-icon';
import { FriendIcon } from '@/components/ui/icons/friend-icon';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setProfileTransitionSource } from '@/lib/profile-transition';

export type MemberRowMember = {
  id: string;
  handle: string;
  pronouns: string;
  avatarSymbol: GenderSymbol;
};

type Props = {
  member: MemberRowMember;
  /** Right-side content. */
  trailing?: 'chats-joined' | 'friend-badge' | 'you-badge' | 'none';
  /** Required when `trailing === 'chats-joined'`. */
  chatsJoined?: number;
  /** Optional override for the default tap handler (which routes to /profile/{handle}). */
  onPress?: () => void;
  /** Custom node rendered on the right (overrides `trailing`). */
  rightSlot?: React.ReactNode;
};

export function MemberRow({ member, trailing = 'chats-joined', chatsJoined, onPress, rightSlot }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  // Seed by handle so the row's avatar matches the profile hero's avatar
  // (ProfileHero seeds by profile.id, and profile.id === handle in the directory).
  const { bg, symbol } = getAvatarColors(member.handle);
  const avatarRef = useRef<View>(null);

  function handlePress() {
    if (onPress) return onPress();
    const node = avatarRef.current;
    if (!node) {
      router.push({ pathname: '/user/[username]', params: { username: member.handle } });
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      setProfileTransitionSource({
        rect: { x, y, width, height },
        username: member.handle,
        seed: member.handle,
        avatarSymbol: member.avatarSymbol,
        bg,
        symbol,
      });
      router.push({ pathname: '/user/[username]', params: { username: member.handle } });
    });
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.gray100 },
        pressed && styles.rowPressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Open profile for @${member.handle}`}
    >
      <View ref={avatarRef} collapsable={false}>
        <GenderAvatar symbol={member.avatarSymbol} size={32} bgColor={bg} symbolColor={symbol} />
      </View>

      <View style={styles.info}>
        <Text style={[styles.handle, { color: colors.textPrimary }]}>@{member.handle} </Text>
        <Text style={[styles.pronouns, { color: colors.textSecondary }]}>({member.pronouns})</Text>
      </View>

      {rightSlot ? (
        <View style={styles.rightSlot}>{rightSlot}</View>
      ) : trailing === 'chats-joined' && typeof chatsJoined === 'number' ? (
        <View style={styles.chatsJoined}>
          <Text style={[styles.chatsJoinedText, { color: colors.textPrimary }]}>{chatsJoined}</Text>
          <ChatIcon size={18} color={colors.textPrimary} />
        </View>
      ) : trailing === 'friend-badge' ? (
        <FriendIcon size={24} />
      ) : trailing === 'you-badge' ? (
        <View style={[styles.youBadge, { backgroundColor: colors.gray100 }]}>
          <Text style={[styles.youBadgeText, { color: colors.chatBlue }]}>You :)</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.gray100,
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
  },
  rowPressed: {
    opacity: 0.6,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
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
    color: Colors.gray40,
  },
  chatsJoined: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  chatsJoinedText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.black,
    letterSpacing: -0.24,
  },
  rightSlot: {
    flexShrink: 0,
  },
  youBadge: {
    backgroundColor: Colors.gray100,
    borderRadius: Radius.xs,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexShrink: 0,
  },
  youBadgeText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.blue,
    letterSpacing: -0.24,
  },
});
