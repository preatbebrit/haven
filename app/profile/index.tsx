import { useFocusEffect } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import {
  Animated,
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

import { DevSeedPanel } from '@/components/dev/dev-seed-panel';
import { EmptyState } from '@/components/friends/empty-state';
import { MyFriendsPreview } from '@/components/profile/my-friends-preview';
import { ProfileHero } from '@/components/profile/profile-hero';
import { ProfileInfoBlock } from '@/components/profile/profile-info-block';
import { ProfilePromptDeck } from '@/components/profile/profile-prompt-deck';
import { useFriendCounts } from '@/hooks/use-friend-counts';
import { useNotifications } from '@/hooks/use-notifications';
import { AppHeader } from '@/components/ui/app-header';
import { CountBadge } from '@/components/ui/count-badge';
import { GenderAvatar, getAvatarColors, type GenderSymbol } from '@/components/ui/gender-avatar';
import { CloseIcon } from '@/components/ui/icons/close-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Toast } from '@/components/ui/toast';
import {
  getEffectivePromptColors,
  MOCK_GROUP_CARDS,
} from '@/constants/mock-groups';
import { Colors, FontFamily, FontSize, Radius, Spacing, TextStyle, type PromptColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCurrentUser } from '@/contexts/current-user-context';
import { clearBio, getBio, setBio } from '@/lib/bio-storage';
import { popPendingToast } from '@/lib/pending-toast';
import {
  clearProfileTransitionSource,
  getProfileTransitionSource,
} from '@/lib/profile-transition';
import {
  GALLERY_SIZE,
  getGallery,
  persistPickedImage,
  removePersistedImage,
  setGallery,
  type GallerySlots,
} from '@/lib/gallery-storage';
import { getPromptAnswers } from '@/lib/prompt-answer-storage';

const HERO_HEIGHT = 300;

type PromptCardData = {
  id: string;
  handle: string;
  pronouns: string;
  avatarSymbol: GenderSymbol;
  question: string;
  answer: string;
  promptColors: PromptColors;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ShareIcon({ color }: { color: string }) {
  // Reply arrow path, mirrored horizontally (scaleX: -1) = Figma Share icon
  return (
    <View style={{ transform: [{ scaleX: -1 }] }}>
      <Svg viewBox="0 0 14 15.364" width={14} height={14} fill="none">
        <Path
          d="M0.292893 6.65685C-0.0976311 7.04738 -0.0976311 7.68054 0.292893 8.07107L6.65685 14.435C7.04738 14.8256 7.68054 14.8256 8.07107 14.435C8.46159 14.0445 8.46159 13.4113 8.07107 13.0208L2.41421 7.36396L8.07107 1.70711C8.46159 1.31658 8.46159 0.683418 8.07107 0.292893C7.68054 -0.097631 7.04738 -0.097631 6.65685 0.292893L0.292893 6.65685ZM13 7.36396H14V6.36396H13V7.36396ZM1 7.36396V8.36396H13V7.36396V6.36396H1V7.36396ZM13 7.36396H12V15.364H13H14V7.36396H13Z"
          fill={color}
        />
      </Svg>
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.gray80 }]} />;
}

function SectionHeader({ title, onShare }: { title: string; onShare: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Pressable
        style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.65 }]}
        onPress={onShare}
        accessibilityRole="button"
        accessibilityLabel={`Share ${title} with a friend`}
      >
        <Text style={[styles.shareBtnText, { color: colors.textPrimary }]}>Share with Friend</Text>
        <ShareIcon color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

function GallerySlot({
  size,
  uri,
  onPress,
}: {
  size: number;
  uri: string | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  if (uri) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.gallerySlotFilled,
          { width: size, height: size, backgroundColor: colors.gray100 },
          pressed && { opacity: 0.85 },
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="View image"
      >
        <ExpoImage source={{ uri }} style={styles.gallerySlotImage} contentFit="cover" />
      </Pressable>
    );
  }
  const scale = useRef(new Animated.Value(1)).current;
  const springTo = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      friction: 4,
      tension: 140,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => springTo(0.9)}
      onPressOut={() => springTo(1)}
      accessibilityRole="button"
      accessibilityLabel="Add image"
    >
      <Animated.View
        style={[
          styles.gallerySlot,
          { width: size, height: size, borderColor: colors.gray100, transform: [{ scale }] },
        ]}
      >
        <Ionicons name="add" size={20} color={Colors.gray60} />
      </Animated.View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();

  const slotSize = (width - Spacing.md * 2 - 8 * 2) / 3;
  const cardWidth = Math.round(width * 0.6);

  const { friends: friendCount } = useFriendCounts();
  const { friendsWithUnreadCount, markVisibleOnProfile } = useNotifications();

  const [bio, setBioState] = useState<string | null>(null);
  const [gallery, setGalleryState] = useState<GallerySlots>(() =>
    Array.from({ length: GALLERY_SIZE }, () => null)
  );
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<
    { groupId: string; answer: string; createdAt: number }[]
  >([]);
  const { displayProfile, refresh: refreshCurrentUser } = useCurrentUser();

  // Build prompt cards from the user's actual saved answers (one per chat
  // they've joined and answered). Static identity fields come from the live
  // display profile so onboarding edits track through.
  const promptCards: PromptCardData[] = useMemo(() => {
    return savedAnswers
      .map((a) => {
        const group = MOCK_GROUP_CARDS.find((g) => g.id === a.groupId);
        if (!group) return null;
        return {
          id: a.groupId,
          handle: displayProfile.handle,
          pronouns: displayProfile.pronouns,
          avatarSymbol: displayProfile.avatarSymbol,
          question: group.question,
          answer: a.answer,
          promptColors: getEffectivePromptColors(group),
        } satisfies PromptCardData;
      })
      .filter((c): c is PromptCardData => c !== null);
  }, [
    savedAnswers,
    displayProfile.handle,
    displayProfile.pronouns,
    displayProfile.avatarSymbol,
  ]);

  // Re-read onboarding-derived profile on focus so edits via Settings or a
  // fresh onboarding run show up immediately when the user returns. The
  // current-user context already refreshes on AppState `active`; this covers
  // navigation-only updates within the app.
  useFocusEffect(
    useCallback(() => {
      void refreshCurrentUser();
    }, [refreshCurrentUser]),
  );

  // Re-read saved prompt answers on focus. Sorted newest-first so the most
  // recent answer is the front card in the deck.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getPromptAnswers().then((all) => {
        if (cancelled) return;
        const list = Object.values(all)
          .map((c) => ({ groupId: c.groupId, answer: c.answer, createdAt: c.createdAt }))
          .sort((a, b) => b.createdAt - a.createdAt);
        setSavedAnswers(list);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      const msg = popPendingToast();
      if (msg) setToast(msg);
    }, []),
  );

  // Mark notifications visible on this screen (top-6 friends in MyFriendsPreview)
  // as seen when the user navigates away.
  useFocusEffect(
    useCallback(() => {
      return () => {
        markVisibleOnProfile();
      };
    }, [markVisibleOnProfile]),
  );


  const heroScrollY = useRef(new Animated.Value(0)).current;
  // On overscroll-down (scrollY < 0), pin the hero's top to the viewport top
  // and let it stretch downward to fully cover the gap above the next content.
  // Math assumes default center-origin scale: with scale = 1 + |c|/H, half the
  // extra height grows up and half down. To keep the top at the viewport top
  // we translate by c/2 (moving up by half the overscroll).
  const heroTranslateY = heroScrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0],
    outputRange: [-HERO_HEIGHT / 2, 0],
    extrapolateRight: 'clamp',
  });
  const heroScale = heroScrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0],
    outputRange: [2, 1],
    extrapolateRight: 'clamp',
  });
  const onHeroScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: heroScrollY } } }],
    { useNativeDriver: true },
  );

  useEffect(() => {
    getBio().then((v) => setBioState(v ?? ''));
    getGallery().then(setGalleryState);
  }, []);

  // Drain any stale transition source from callers that still set one — the
  // native stack push handles the slide-in/out, so no morph animation runs.
  useEffect(() => {
    if (getProfileTransitionSource()) clearProfileTransitionSource();
  }, []);

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

  async function handleSlotPress(index: number) {
    if (gallery[index]) {
      setPreviewIndex(index);
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;

      const emptyCount = gallery.filter((u) => !u).length;
      if (emptyCount === 0) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: emptyCount,
        orderedSelection: true,
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      });
      if (result.canceled || result.assets.length === 0) return;

      const stableUris = await Promise.all(
        result.assets.map((a) => persistPickedImage(a.uri)),
      );

      // Fill empty slots in order with the picked images.
      const next = [...gallery];
      let assetIdx = 0;
      for (let i = 0; i < next.length && assetIdx < stableUris.length; i += 1) {
        if (!next[i]) {
          next[i] = stableUris[assetIdx];
          assetIdx += 1;
        }
      }
      // Defensive cleanup: any assets that didn't fit (shouldn't happen since
      // selectionLimit caps to emptyCount, but kept for safety).
      if (assetIdx < stableUris.length) {
        await Promise.all(stableUris.slice(assetIdx).map(removePersistedImage));
      }

      setGalleryState(next);
      setGallery(next);
    } catch (err) {
      console.warn('[gallery] image pick failed', err);
    }
  }

  async function handleRemovePreview() {
    if (previewIndex === null) return;
    const prevUri = gallery[previewIndex];
    const filled = gallery.filter((u, i) => u && i !== previewIndex) as string[];
    const next: GallerySlots = Array.from({ length: GALLERY_SIZE }, (_, i) =>
      i < filled.length ? filled[i] : null
    );
    setGalleryState(next);
    setGallery(next);
    setPreviewIndex(null);
    if (prevUri) await removePersistedImage(prevUri);
  }

  async function handleBioSubmit(next: string) {
    if (next.length === 0) {
      await clearBio();
      setBioState('');
    } else {
      await setBio(next);
      setBioState(next);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Toast message={toast} onDismiss={() => setToast(null)} />
      <View style={[StyleSheet.absoluteFill, styles.screen, { backgroundColor: colors.backgroundPrimary }]}>
      <Animated.ScrollView
        style={styles.scrollFlex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={onHeroScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.heroBlock}>
          {/* Avatar + bg — scales and translates during overscroll. */}
          <Animated.View
            style={{
              transform: [{ translateY: heroTranslateY }, { scale: heroScale }],
            }}
          >
            <ProfileHero
              headerless
              avatarSymbol={displayProfile.avatarSymbol}
              seed={displayProfile.handle}
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
              icon: <Ionicons name="arrow-back" size={20} color={colors.textPrimaryInverted} />,
              onPress: handleBack,
              accessibilityLabel: 'Go back',
            }}
            right={{
              kind: 'icon',
              icon: <Ionicons name="settings-outline" size={22} color={colors.textPrimaryInverted} />,
              onPress: () => router.push('/profile/settings'),
              accessibilityLabel: 'Settings',
            }}
          />
        </View>

        <ProfileInfoBlock
          handle={displayProfile.handle}
          pronouns={displayProfile.pronouns}
          tags={displayProfile.tags}
          bio={bio}
          editable
          onSubmitBio={handleBioSubmit}
        />

        <Divider />

        <View style={styles.statsRow}>
          <View style={[styles.statTile, { backgroundColor: Colors.blue }]}>
            <Text style={[styles.statValue, { color: Colors.skyBlue }]}>
              {promptCards.length}
            </Text>
            <Text style={styles.statLabel}>Chats</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: Colors.purple }]}>
            <Text style={[styles.statValue, { color: Colors.green }]}>{friendCount}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
        </View>

        <Divider />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>My Friends</Text>
              <CountBadge count={friendsWithUnreadCount} size="md" />
            </View>
            <Pressable
              style={({ pressed }) => [styles.seeAllBtn, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/friends')}
              accessibilityRole="button"
              accessibilityLabel="See all friends"
              hitSlop={8}
            >
              <Text style={[styles.seeAllText, { color: colors.textPrimary }]}>See All</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>
          <MyFriendsPreview />
        </View>

        <Divider />

        <View style={styles.section}>
          <SectionHeader
            title="My Gallery"
            onShare={() =>
              router.push({ pathname: '/share-with', params: { kind: 'gallery' } })
            }
          />
          <View style={styles.galleryGrid}>
            {gallery.map((uri, i) => (
              <GallerySlot
                key={i}
                size={slotSize}
                uri={uri}
                onPress={() => handleSlotPress(i)}
              />
            ))}
          </View>
        </View>

        <Divider />

        <View style={styles.section}>
          <SectionHeader
            title="My Prompt Answers"
            onShare={() =>
              router.push({ pathname: '/share-with', params: { kind: 'prompts' } })
            }
          />
          {promptCards.length === 0 ? (
            <EmptyState
              title="No prompt answers yet"
              body="Join a chat to share your first answer."
              ctaLabel="Browse chats"
              onCtaPress={() => {
                // Pop back to chat-selection (which sits below profile in the
                // stack) so the transition slides in from the left instead of
                // the push-from-right that a fresh replace would produce.
                if (router.canGoBack()) router.back();
                else router.replace('/(tabs)/chat-selection');
              }}
            />
          ) : (
            <View style={{ marginTop: Spacing.md + 8, alignItems: 'center' }}>
              <ProfilePromptDeck cards={promptCards} cardWidth={cardWidth} />
            </View>
          )}
        </View>

        <DevSeedPanel />
      </Animated.ScrollView>
      </View>

      <Modal
        visible={previewIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewIndex(null)}
      >
        <View style={styles.previewOverlay}>
          <PressableScale
            style={[styles.previewClose, { top: insets.top + 8 }]}
            onPress={() => setPreviewIndex(null)}
            accessibilityRole="button"
            accessibilityLabel="Close preview"
            hitSlop={8}
          >
            <CloseIcon size={20} color={Colors.white} />
          </PressableScale>
          {previewIndex !== null && gallery[previewIndex] && (
            <ExpoImage
              source={{ uri: gallery[previewIndex] as string }}
              style={styles.previewImage}
              contentFit="contain"
            />
          )}
          <View style={[styles.previewActions, { paddingBottom: insets.bottom + Spacing.md }]}>
            <Pressable
              style={({ pressed }) => [styles.previewRemove, pressed && { opacity: 0.9 }]}
              onPress={handleRemovePreview}
              accessibilityRole="button"
              accessibilityLabel="Remove image"
            >
              <Text style={styles.previewRemoveText}>Remove</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  scrollFlex: { flex: 1 },
  heroBlock: { position: 'relative' },
  content: { paddingBottom: 60 },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray80,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.lg,
  },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  statTile: {
    flex: 1,
    height: 120,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seeAllText: {
    ...TextStyle.captionBold,
    color: Colors.black,
  },
  statValue: {
    ...TextStyle.h1,
  },
  statLabel: {
    ...TextStyle.body,
    color: Colors.white,
    textAlign: 'center',
  },

  section: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    lineHeight: 24,
    letterSpacing: -0.8,
    color: Colors.black,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shareBtnText: {
    ...TextStyle.captionBold,
    color: Colors.black,
  },

  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.sm,
  },
  gallerySlot: {
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gallerySlotFilled: {
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.gray100,
  },
  gallerySlotImage: {
    width: '100%',
    height: '100%',
  },

  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewClose: {
    position: 'absolute',
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  previewImage: {
    width: '90%',
    height: '70%',
  },
  previewActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
  },
  previewRemove: {
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cherry,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRemoveText: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.md,
    color: Colors.white,
    letterSpacing: -0.24,
  },

});
