import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MOCK_GROUP_CARDS } from '@/constants/mock-groups';
import { Colors, FontFamily, type PromptColors, Radius, Spacing, TextStyle } from '@/constants/theme';
import { addPendingConnection } from '@/lib/pending-connections';

const CARD_LEFT_PADDING = 32;
const CARD_GAP = 16;

type AnswerCard = {
  id: string;
  handle: string;
  pronouns: string;
  avatarColor: string;
  answer: string;
};

const ANSWER_CARDS: AnswerCard[] = [
  {
    id: 'grover',
    handle: 'grover',
    pronouns: 'She/her',
    avatarColor: Colors.cherry,
    answer: "I'm unlearning shame. And being more confident!",
  },
  {
    id: 'staceygirl',
    handle: 'staceygirl',
    pronouns: 'They/them',
    avatarColor: Colors.skyBlue,
    answer: "I'm unlearning the need to be everything to everyone",
  },
  {
    id: 'mats_nb',
    handle: 'mats_nb',
    pronouns: 'He/him',
    avatarColor: Colors.teal,
    answer: "I'm unlearning that I need a neat label for strangers",
  },
  {
    id: 'xXrXx',
    handle: 'xXrXx',
    pronouns: 'Any/all',
    avatarColor: Colors.lightPurple,
    answer: "I'm unlearning silence. Speaking up even when it's scary",
  },
];

function AnswerCardItem({
  item,
  cardWidth,
  onLike,
  liked,
  promptColors,
}: {
  item: AnswerCard;
  cardWidth: number;
  onLike: (id: string) => void;
  liked: boolean;
  promptColors: PromptColors;
}) {
  const scale = useSharedValue(1);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handleLike() {
    if (liked) return;
    scale.value = withSequence(
      withSpring(1.4, { damping: 4, stiffness: 300 }),
      withSpring(1.0, { damping: 6, stiffness: 200 }),
    );
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onLike(item.id);
  }

  const { bg, fg, support } = promptColors;
  const btnBorderColor = `${support}59`; // ~35% opacity

  return (
    <View style={[styles.card, { width: cardWidth, backgroundColor: bg }]}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
          <Text style={styles.avatarInitial}>{item.handle[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.handle}>
          <Text style={[styles.handleUsername, { color: support }]}>@{item.handle} </Text>
          {item.pronouns ? <Text style={[styles.handlePronouns, { color: support }]}>({item.pronouns})</Text> : null}
        </Text>
      </View>

      {/* Answer */}
      <Text style={[styles.answerText, { color: fg }]}>{item.answer}</Text>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, { borderColor: btnBorderColor }, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Reply"
        >
          <Text style={[styles.actionBtnText, { color: support }]}>← Reply</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { borderColor: btnBorderColor },
            liked && styles.actionBtnLiked,
            pressed && !liked && { opacity: 0.8 },
          ]}
          onPress={handleLike}
          accessibilityRole="button"
          accessibilityLabel="Like"
        >
          <Animated.Text style={[styles.likeHeart, { color: `${support}CC` }, liked && styles.likeHeartActive, heartStyle]}>
            {liked ? '♥' : '♡'}
          </Animated.Text>
          <Text style={[styles.actionBtnText, { color: support }, liked && styles.actionBtnTextLiked]}>Like</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AnswersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList<AnswerCard>>(null);

  const promptColors = useMemo(() => {
    const group = MOCK_GROUP_CARDS.find((g) => g.id === groupId) ?? MOCK_GROUP_CARDS[0];
    return group.promptColors;
  }, [groupId]);

  // Card is 317px wide per Figma; clamp to screen if narrow device
  const cardWidth = Math.min(317, width - CARD_LEFT_PADDING - 44);
  const snapInterval = cardWidth + CARD_GAP;

  const onLike = useCallback((id: string) => {
    setLikedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      const card = ANSWER_CARDS.find((c) => c.id === id);
      if (card) {
        addPendingConnection({
          handle: card.handle,
          avatarColor: card.avatarColor,
          answer: card.answer,
        });
      }
      return next;
    });
  }, []);

  function handleClose() {
    router.replace('/chat');
  }

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems[0]?.index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem: ListRenderItem<AnswerCard> = useCallback(
    ({ item }) => (
      <AnswerCardItem
        item={item}
        cardWidth={cardWidth}
        onLike={onLike}
        liked={likedIds.has(item.id)}
        promptColors={promptColors}
      />
    ),
    [cardWidth, onLike, likedIds, promptColors],
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
          <Text style={styles.topBarTitle}>Answers</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <FlatList
          ref={flatListRef}
          data={ANSWER_CARDS}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          horizontal
          pagingEnabled={false}
          snapToInterval={snapInterval}
          snapToAlignment="start"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          bounces={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
        />

        {/* Segmented progress indicator */}
        <View style={styles.pagination}>
          {ANSWER_CARDS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.segment,
                i === currentIndex ? styles.segmentActive : styles.segmentInactive,
              ]}
            />
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // ── Top bar ───────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    color: Colors.black,
  },
  topBarSpacer: {
    width: 48,
  },

  // ── Close button ──────────────────────────────────────────────────────────
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Colors.white,
  },

  // ── List ──────────────────────────────────────────────────────────────────
  listContent: {
    paddingLeft: CARD_LEFT_PADDING,
    paddingRight: CARD_LEFT_PADDING,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    paddingTop: 14,
    paddingBottom: 21,
    gap: Spacing.lg,
    justifyContent: 'space-between',
    // Height matches Figma proportion (~526px on 852px screen)
    aspectRatio: 317 / 526,
  },

  // ── Author ────────────────────────────────────────────────────────────────
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.white,
  },
  handle: {
    flexShrink: 1,
  },
  handleUsername: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
  },
  handlePronouns: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 20,
  },

  // ── Answer text ───────────────────────────────────────────────────────────
  answerText: {
    ...TextStyle.h3,
    flex: 1,
  },

  // ── Action buttons ────────────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionBtn: {
    height: 44,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1.5,
  },
  actionBtnLiked: {
    borderColor: 'rgba(255,120,170,0.5)',
    backgroundColor: 'rgba(255,80,140,0.2)',
  },
  actionBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
  },
  actionBtnTextLiked: {
    color: '#ff80b0',
  },
  likeHeart: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
  },
  likeHeartActive: {
    color: '#ff5090',
  },

  // ── Pagination ────────────────────────────────────────────────────────────
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: CARD_LEFT_PADDING,
    paddingVertical: Spacing.md,
  },
  segment: {
    height: 4,
    borderRadius: 2,
  },
  segmentActive: {
    flex: 3,
    backgroundColor: Colors.black,
  },
  segmentInactive: {
    flex: 1,
    backgroundColor: Colors.gray80,
  },
});
