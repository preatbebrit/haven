import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { FriendTileGlow } from '@/components/profile/friend-tile-glow';
import { GenderAvatar, getAvatarColors } from '@/components/ui/gender-avatar';
import { useFriends } from '@/contexts/friends-context';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/use-notifications';
import { useTheme } from '@/hooks/use-theme';
import { getGalleryFor, getProfileById } from '@/lib/profile-directory';
import { setProfileTransitionSource } from '@/lib/profile-transition';
import { TOP_FRIENDS_SIZE } from '@/lib/top-friends-storage';

const SCATTER_POSITIONS: { left: string; top: number; rotate: string }[] = [
  { left: '4%', top: 6, rotate: '-14deg' },
  { left: '34%', top: -6, rotate: '4deg' },
  { left: '64%', top: 8, rotate: '13deg' },
];

const PROMO_CARDS: { copy: string; image: number }[] = [
  { copy: 'h@ven is for\nfriends', image: require('@/assets/images/friend-empty-1.png') },
  { copy: 'a friend is like a\npretty flower', image: require('@/assets/images/friend-empty-2.png') },
  { copy: 'friends are there\nto help', image: require('@/assets/images/friend-empty-3.png') },
  { copy: 'friend hugs are\nnice :)', image: require('@/assets/images/friend-empty-4.png') },
  { copy: 'be a good friend\nto someone', image: require('@/assets/images/friend-empty-5.png') },
  { copy: 'friends are fun', image: require('@/assets/images/friend-empty-6.png') },
];

export function MyFriendsPreview() {
  const router = useRouter();
  const { colors } = useTheme();
  const { topFriends, shares, currentUserId } = useFriends();
  const { unreadByFriendId } = useNotifications();
  const { width } = useWindowDimensions();
  const avatarRefs = useRef<(View | null)[]>([]);

  // Section has Spacing.md horizontal padding, grid has Spacing.sm (8) gaps between 3 columns.
  const tileWidth = (width - Spacing.md * 2 - Spacing.sm * 2) / 3;

  const hasAnyFriend = topFriends.some((id) => !!id);

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {Array.from({ length: TOP_FRIENDS_SIZE }).map((_, i) => {
          const friendId = topFriends[i];
          const profile = friendId ? getProfileById(friendId) : null;
          if (profile) {
            const { bg, symbol } = getAvatarColors(profile.handle);
            const sharesGallery = shares.some(
              (s) =>
                s.ownerId === profile.id &&
                s.viewerId === currentUserId &&
                s.kind === 'gallery',
            );
            const scatterPhotos = sharesGallery
              ? getGalleryFor(profile.handle).filter((u): u is string => !!u).slice(0, 3)
              : [];
            const hasUnread = unreadByFriendId.has(profile.id);
            return (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.slotFilled,
                  {
                    width: tileWidth,
                    borderColor: colors.gray100,
                    backgroundColor: colors.backgroundPrimary,
                  },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  const node = avatarRefs.current[i];
                  if (!node) {
                    router.push({
                      pathname: '/user/[username]',
                      params: { username: profile.handle },
                    });
                    return;
                  }
                  node.measureInWindow((x, y, w, h) => {
                    setProfileTransitionSource({
                      rect: { x, y, width: w, height: h },
                      username: profile.handle,
                      seed: profile.handle,
                      avatarSymbol: profile.avatarSymbol,
                      bg,
                      symbol,
                    });
                    router.push({
                      pathname: '/user/[username]',
                      params: { username: profile.handle },
                    });
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel={`Open profile for @${profile.handle}`}
              >
                {scatterPhotos.length > 0 ? (
                  <View pointerEvents="none" style={styles.scatterLayer}>
                    {scatterPhotos.map((uri, idx) => {
                      const pos = SCATTER_POSITIONS[idx];
                      return (
                        <ExpoImage
                          key={idx}
                          source={{ uri }}
                          contentFit="cover"
                          style={[
                            styles.scatterThumb,
                            {
                              left: pos.left as `${number}%`,
                              top: pos.top,
                              borderColor: colors.backgroundPrimary,
                              backgroundColor: colors.gray100,
                              transform: [{ rotate: pos.rotate }],
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                ) : null}
                <View
                  ref={(node) => {
                    avatarRefs.current[i] = node;
                  }}
                  collapsable={false}
                >
                  <GenderAvatar
                    symbol={profile.avatarSymbol}
                    size={32}
                    bgColor={bg}
                    symbolColor={symbol}
                  />
                </View>
                <View style={styles.slotTextWrap}>
                  <Text
                    style={[styles.slotHandle, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    @{profile.handle}
                  </Text>
                  {profile.pronouns ? (
                    <Text
                      style={[styles.slotPronouns, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      ({profile.pronouns})
                    </Text>
                  ) : null}
                </View>
                <FriendTileGlow active={hasUnread} radius={20} strokeWidth={2} />
              </Pressable>
            );
          }
          const card = PROMO_CARDS[i];
          return (
            <Pressable
              key={i}
              style={({ pressed }) => [
                styles.promoCard,
                { width: tileWidth, borderColor: colors.gray100 },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => router.push('/friends')}
              accessibilityRole="button"
              accessibilityLabel="Find friends to favorite"
            >
              <ExpoImage source={card.image} style={styles.promoImage} contentFit="contain" />
              <Text
                style={[styles.promoText, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {card.copy}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!hasAnyFriend ? (
        <Text style={[styles.emptyCaption, { color: colors.textSecondary }]}>
          No favorites yet.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  slotFilled: {
    height: 122,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.gray100,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
    gap: 4,
    overflow: 'hidden',
  },
  scatterLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  scatterThumb: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: Colors.gray100,
  },
  slotTextWrap: {
    alignItems: 'center',
    gap: 4,
  },
  slotHandle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    color: Colors.black,
    textAlign: 'center',
  },
  slotPronouns: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.gray40,
    textAlign: 'center',
  },
  promoCard: {
    height: 122,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 8,
  },
  promoImage: {
    width: 32,
    height: 32,
  },
  promoText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 15,
    color: Colors.gray60,
    letterSpacing: -0.24,
    textAlign: 'center',
  },
  emptyCaption: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.gray60,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
