import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { FriendActionButton } from '@/components/friends/friend-action-button';
import { ProfileGallerySection } from '@/components/profile/profile-gallery-section';
import { ProfileHero } from '@/components/profile/profile-hero';
import { ProfileInfoBlock } from '@/components/profile/profile-info-block';
import { ProfileOverflowSheet } from '@/components/profile/profile-overflow-sheet';
import { ProfilePromptDeck, type PromptDeckCard } from '@/components/profile/profile-prompt-deck';
import { ProfileStatsCards } from '@/components/profile/profile-stats-cards';
import { AppHeader } from '@/components/ui/app-header';
import { type GenderSymbol } from '@/components/ui/gender-avatar';
import { AddFriendsIcon } from '@/components/ui/icons/add-friends-icon';
import { CloseIcon } from '@/components/ui/icons/close-icon';
import { Toast } from '@/components/ui/toast';
import { Colors, FontFamily, getPromptColorsForId, Radius, Spacing, TextStyle } from '@/constants/theme';
import type { FriendPromptEntry } from '@/constants/mock-friend-content';
import { useFriends } from '@/contexts/friends-context';
import { useRelationship } from '@/hooks/use-relationship';
import { useTheme } from '@/hooks/use-theme';
import { popPendingToast } from '@/lib/pending-toast';
import { getGalleryFor, getProfileByUsername, getProfileStats, getPromptsFor } from '@/lib/profile-directory';
import {
  clearProfileTransitionSource,
  getProfileTransitionSource,
} from '@/lib/profile-transition';

const HERO_HEIGHT = 300;
// Content fades in slightly after the modal starts sliding up, so the screen
// feels like it "loads in" rather than appearing fully formed.
const CONTENT_ENTER_DELAY = 120;
const CONTENT_ENTER_DURATION = 280;

function buildFriendPromptCards(
  ownerId: string,
  handle: string,
  pronouns: string,
  avatarSymbol: GenderSymbol,
  entries: FriendPromptEntry[],
): PromptDeckCard[] {
  return entries.map((entry, i) => ({
    id: `${handle}-${i}`,
    handle,
    pronouns,
    avatarSymbol,
    question: entry.question,
    answer: entry.answer,
    promptColors: getPromptColorsForId(`${ownerId}-${i}`),
  }));
}

export default function PublicProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { username } = useLocalSearchParams<{ username: string }>();
  const lookup = getProfileByUsername(typeof username === 'string' ? username : '');
  const { bannedIds } = useFriends();
  // A banned profile is hidden the same way as a missing one — no leaking
  // identity, gallery, or prompt content.
  const profile = lookup && !bannedIds.has(lookup.id) ? lookup : null;
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Always call hooks in the same order — pass empty string when profile is missing.
  const relationship = useRelationship(profile?.id ?? '');

  // Drain any stale transition source from older callers — the native
  // fullScreenModal presentation handles the slide-up-from-bottom transition.
  useEffect(() => {
    if (getProfileTransitionSource()) clearProfileTransitionSource();
  }, []);

  // Drain pending toast on focus — e.g., after the user submits a report from
  // the overflow sheet, the /report screen sets a toast and pops back here.
  useFocusEffect(
    useCallback(() => {
      const msg = popPendingToast();
      if (msg) setToast(msg);
    }, []),
  );


  // Content fades in after a brief delay so it appears slightly after the
  // modal starts sliding up. Dismissal just calls router.back() — the modal
  // slides down without a preceding content fade.
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    contentOpacity.value = withDelay(
      CONTENT_ENTER_DELAY,
      withTiming(1, { duration: CONTENT_ENTER_DURATION }),
    );
  }, [contentOpacity]);

  const contentFadeStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  // ── Overscroll-drag animation on the hero ──────────────────────────────────
  // Mirrors the user's own profile screen (app/profile/index.tsx): when the user
  // pulls down past the top, the hero pins to the viewport top and grows to fill
  // the gap. With default center-origin scaling, half the extra height grows up
  // and half down — translate by c/2 so the top stays glued to the viewport top.
  const heroScrollY = useSharedValue(0);
  const heroScrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      heroScrollY.value = e.contentOffset.y;
    },
  });
  const heroDragStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      heroScrollY.value,
      [-HERO_HEIGHT, 0],
      [-HERO_HEIGHT / 2, 0],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      heroScrollY.value,
      [-HERO_HEIGHT, 0],
      [2, 1],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateY }, { scale }] };
  });

  if (!profile) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.notFound, { backgroundColor: colors.backgroundPrimary }]}>
          <Text style={[styles.notFoundTitle, { color: colors.textPrimary }]}>Profile not found</Text>
          <Text style={[styles.notFoundBody, { color: colors.textSecondary }]}>
            We couldn&apos;t find @{String(username)}.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.notFoundBtn,
              { backgroundColor: colors.buttonPrimary },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Text style={[styles.notFoundBtnText, { color: colors.textPrimaryInverted }]}>Go back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const {
    state,
    sharesGallery,
    sharesPrompts,
    sharesIdentity,
    iShareGallery,
    iSharePrompts,
    iShareIdentity,
  } = relationship;
  const isFriend = state === 'friend';
  const cardWidth = Math.round(width * 0.6);
  const friendPromptCards = isFriend
    ? buildFriendPromptCards(
        profile.id,
        profile.handle,
        profile.pronouns,
        profile.avatarSymbol,
        getPromptsFor(profile.handle),
      )
    : [];
  const friendGallery = isFriend ? getGalleryFor(profile.handle) : [];
  const profileStats = getProfileStats(profile.handle);

  // The bottom action bar (visible only for non-friend states) is absolutely
  // positioned. Reserve room at the end of the scroll content so the centered
  // empty state above doesn't sit underneath it.
  const bottomBarReserve = !isFriend
    ? 48 /* button */ + Spacing.md /* paddingTop */ + Math.max(insets.bottom, Spacing.md)
    : 60;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <Toast message={toast} onDismiss={() => setToast(null)} />
      <View style={[StyleSheet.absoluteFill, styles.screen, { backgroundColor: colors.backgroundPrimary }]}>
        <Animated.View style={[styles.fadeLayer, contentFadeStyle]}>
        <Animated.ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            !isFriend && styles.contentNoFriend,
            { paddingBottom: bottomBarReserve },
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={heroScrollHandler}
          scrollEventThrottle={16}
        >
          <View style={styles.heroBlock}>
            {/* Avatar + bg — scales and translates during overscroll. */}
            <Animated.View style={heroDragStyle}>
              <ProfileHero
                headerless
                avatarSymbol={profile.avatarSymbol}
                seed={profile.id}
                onBack={handleBack}
                trailing={{ kind: 'none' }}
              />
            </Animated.View>
            {/* Buttons — sibling of the scaled wrapper, so they translate with
                the scroll but don't stretch when the avatar scales. */}
            <AppHeader
              variant="overlay"
              left={{
                kind: 'icon',
                icon: <CloseIcon size={20} color={colors.textPrimaryInverted} />,
                onPress: handleBack,
                accessibilityLabel: 'Close',
              }}
              right={
                isFriend
                  ? {
                      kind: 'pill',
                      label: 'Friend Status',
                      icon: (
                        <Ionicons name="chevron-down" size={20} color={colors.textPrimaryInverted} />
                      ),
                      onPress: () => setOverflowOpen(true),
                      accessibilityLabel: 'Open friend status menu',
                    }
                  : {
                      kind: 'icon',
                      icon: (
                        <Ionicons name="chevron-down" size={20} color={colors.textPrimaryInverted} />
                      ),
                      onPress: () => setOverflowOpen(true),
                      accessibilityLabel: 'More options',
                    }
              }
            />
          </View>

          <ProfileInfoBlock
            handle={profile.handle}
            pronouns={profile.pronouns}
            tags={isFriend && sharesIdentity ? profile.identityTags : undefined}
            bio={profile.bio ?? ''}
            editable={false}
          />

          <View style={[styles.sectionDivider, { backgroundColor: colors.gray100 }]} />
          <View style={styles.section}>
            <ProfileStatsCards chats={profileStats.chats} friends={profileStats.friends} />
          </View>

          {!isFriend ? (
            <View style={styles.becomeFriendsState}>
              <AddFriendsIcon size={48} color={colors.textSecondary} />
              <Text style={[styles.becomeFriendsText, { color: colors.textSecondary }]}>
                Learn more about them by becoming friends.
              </Text>
            </View>
          ) : null}

          {isFriend && sharesGallery ? (
            <>
              <View style={[styles.sectionDivider, { backgroundColor: colors.gray100 }]} />
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Gallery</Text>
                <ProfileGallerySection
                  items={friendGallery}
                  ownerHandle={profile.handle}
                  onPressItem={(i) =>
                    router.push({
                      pathname: '/photos',
                      params: { owner: profile.handle, start: String(i) },
                    })
                  }
                />
              </View>
            </>
          ) : null}

          {isFriend && sharesPrompts ? (
            <>
              <View style={[styles.sectionDivider, { backgroundColor: colors.gray100 }]} />
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Past prompt answers</Text>
                <View style={{ marginTop: Spacing.lg, alignItems: 'center' }}>
                  <ProfilePromptDeck
                  cards={friendPromptCards}
                  cardWidth={cardWidth}
                  totalAnswered={profileStats.chats}
                />
                </View>
              </View>
            </>
          ) : null}

          {isFriend && !sharesGallery && !sharesPrompts ? (
            <View style={styles.shareHint}>
              <Text style={[styles.shareHintTitle, { color: colors.textPrimary }]}>You&apos;re friends with @{profile.handle}.</Text>
              <Text style={[styles.shareHintBody, { color: colors.textSecondary }]}>
                Tap Friend Status above to share your gallery or prompts. They&apos;ll show up here once you both share.
              </Text>
            </View>
          ) : null}
        </Animated.ScrollView>

        {!isFriend ? (
          <View
            style={[
              styles.bottomActionBar,
              {
                paddingBottom: Math.max(insets.bottom, Spacing.md),
                backgroundColor: colors.backgroundPrimary,
              },
            ]}
          >
            <FriendActionButton targetId={profile.id} variant="hero" />
          </View>
        ) : null}
        </Animated.View>

        <ProfileOverflowSheet
          visible={overflowOpen}
          isFriend={isFriend}
          targetId={profile.id}
          targetHandle={profile.handle}
          iShareIdentityWithThem={iShareIdentity}
          iShareGalleryWithThem={iShareGallery}
          iSharePromptsWithThem={iSharePrompts}
          onClose={() => setOverflowOpen(false)}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Colors.white },
  fadeLayer: { flex: 1 },
  scroll: { flex: 1 },
  heroBlock: { position: 'relative' },
  content: { paddingBottom: 60 },
  contentNoFriend: {
    flexGrow: 1,
  },

  becomeFriendsState: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  becomeFriendsText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.gray40,
    textAlign: 'center',
    maxWidth: 280,
  },
  bottomActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
  },
  section: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionDivider: {
    height: 1,
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.gray100,
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.8,
    color: Colors.black,
  },
  shareHint: {
    marginTop: Spacing.xxl,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    gap: 4,
    alignItems: 'center',
  },
  shareHintTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.black,
    textAlign: 'center',
  },
  shareHintBody: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.gray40,
    textAlign: 'center',
  },

  notFound: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  notFoundTitle: {
    ...TextStyle.h3,
    color: Colors.black,
    textAlign: 'center',
  },
  notFoundBody: {
    ...TextStyle.body,
    color: Colors.gray40,
    textAlign: 'center',
  },
  notFoundBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.black,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
  },
  notFoundBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.white,
  },
});
