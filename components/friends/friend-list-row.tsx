import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FriendTileGlow } from '@/components/profile/friend-tile-glow';
import { GenderAvatar, getAvatarColors, type GenderSymbol } from '@/components/ui/gender-avatar';
import { AddFavoriteIcon } from '@/components/ui/icons/add-favorite-icon';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setProfileTransitionSource } from '@/lib/profile-transition';

type Props = {
  friend: {
    id: string;
    handle: string;
    pronouns: string;
    avatarSymbol: GenderSymbol;
  };
  isFavorite: boolean;
  isNew?: boolean;
  onToggleFavorite: () => void;
};

export function FriendListRow({ friend, isFavorite, isNew = false, onToggleFavorite }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  // Seed by handle so the row matches the profile hero (which seeds by profile.id === handle).
  const { bg, symbol } = getAvatarColors(friend.handle);
  const avatarRef = useRef<View>(null);

  function handlePress() {
    const node = avatarRef.current;
    if (!node) {
      router.push({ pathname: '/user/[username]', params: { username: friend.handle } });
      return;
    }
    node.measureInWindow((x, y, w, h) => {
      setProfileTransitionSource({
        rect: { x, y, width: w, height: h },
        username: friend.handle,
        seed: friend.handle,
        avatarSymbol: friend.avatarSymbol,
        bg,
        symbol,
      });
      router.push({ pathname: '/user/[username]', params: { username: friend.handle } });
    });
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.gray100 },
        pressed && { opacity: 0.8 },
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={
        isNew
          ? `Open profile for @${friend.handle}, new friend`
          : `Open profile for @${friend.handle}`
      }
    >
      <View style={styles.left}>
        <View ref={avatarRef} collapsable={false}>
          <GenderAvatar symbol={friend.avatarSymbol} size={32} bgColor={bg} symbolColor={symbol} />
        </View>

        <View style={styles.info}>
          <Text
            style={[styles.handle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            @{friend.handle}
          </Text>
          {friend.pronouns ? (
            <Text style={[styles.pronouns, { color: colors.textPrimary }]}>
              ({friend.pronouns})
            </Text>
          ) : null}
        </View>
      </View>

      {isNew ? (
        <View style={styles.newTag}>
          <Text style={styles.newLabel}>New!</Text>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            isFavorite ? styles.favoriteTag : styles.favorite,
            pressed && { opacity: 0.6 },
          ]}
          onPress={onToggleFavorite}
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite
              ? `Remove @${friend.handle} from favorites`
              : `Add @${friend.handle} to favorites`
          }
          hitSlop={8}
        >
          {isFavorite ? (
            <Text style={styles.favoriteLabel}>Favorite {'<3'}</Text>
          ) : (
            <>
              <Text style={[styles.favoriteLabel, { color: colors.textPrimary }]}>Favorite</Text>
              <AddFavoriteIcon size={24} color={colors.textSecondary} />
            </>
          )}
        </Pressable>
      )}
      <FriendTileGlow active={isNew} radius={20} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: Colors.gray40,
  },
  favorite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  favoriteTag: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.magenta,
    flexShrink: 0,
  },
  favoriteLabel: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    color: Colors.black,
  },
  newTag: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.green,
    flexShrink: 0,
  },
  newLabel: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    color: Colors.blue,
  },
});
