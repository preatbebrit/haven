import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
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

import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { addPendingConnection } from '@/lib/pending-connections';

const CARD_PURPLE = '#6B2FFF';

type AnswerCard = {
  id: string;
  handle: string;
  avatarColor: string;
  answer: string;
};

const ANSWER_CARDS: AnswerCard[] = [
  {
    id: 'grover',
    handle: 'grover',
    avatarColor: '#ff006a',
    answer: "I'm unlearning shame. And being more confident!",
  },
  {
    id: 'staceygirl',
    handle: 'staceygirl',
    avatarColor: '#00e9ff',
    answer: "I'm unlearning the need to be everything to everyone",
  },
  {
    id: 'mats_nb',
    handle: 'mats_nb',
    avatarColor: '#ffb800',
    answer: "I'm unlearning that I need a neat label for strangers",
  },
  {
    id: 'xXrXx',
    handle: 'xXrXx',
    avatarColor: '#c000ff',
    answer: "I'm unlearning silence. Speaking up even when it's scary",
  },
];

function AnswerCardItem({
  item,
  cardWidth,
  onMeToo,
  liked,
}: {
  item: AnswerCard;
  cardWidth: number;
  onMeToo: (id: string) => void;
  liked: boolean;
}) {
  const scale = useSharedValue(1);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handleMeToo() {
    if (liked) return;
    scale.value = withSequence(
      withSpring(1.4, { damping: 4, stiffness: 300 }),
      withSpring(1.0, { damping: 6, stiffness: 200 }),
    );
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onMeToo(item.id);
  }

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <View style={styles.cardInner}>
        {/* Avatar + handle */}
        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: item.avatarColor }]}>
            <Text style={styles.avatarInitial}>
              {item.handle[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.handle}>@{item.handle}</Text>
        </View>

        {/* Answer text */}
        <Text style={styles.answerText}>{item.answer}</Text>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.replyBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Reply"
          >
            <Text style={styles.replyBtnText}>← Reply</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.metooBtn,
              liked && styles.metooBtnLiked,
              pressed && !liked && { opacity: 0.8 },
            ]}
            onPress={handleMeToo}
            accessibilityRole="button"
            accessibilityLabel="Me too"
          >
            <Animated.Text style={[styles.metooBtnText, liked && styles.metooBtnTextLiked, heartStyle]}>
              {liked ? '♥' : '♡'}
            </Animated.Text>
            <Text style={[styles.metooBtnLabel, liked && styles.metooBtnLabelLiked]}>
              Me too
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function AnswersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList<AnswerCard>>(null);

  const cardWidth = width;

  const onMeToo = useCallback((id: string) => {
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
        onMeToo={onMeToo}
        liked={likedIds.has(item.id)}
      />
    ),
    [cardWidth, onMeToo, likedIds],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Meet your group',
          headerTitleStyle: {
            fontFamily: FontFamily.bold,
            fontSize: FontSize.md,
            color: Colors.white,
          },
          headerStyle: { backgroundColor: CARD_PURPLE },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingRight: Spacing.sm })}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          ),
        }}
      />

      <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <FlatList
          ref={flatListRef}
          data={ANSWER_CARDS}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          bounces={false}
          decelerationRate="fast"
        />

        {/* Pagination dots */}
        <View style={styles.dots}>
          {ANSWER_CARDS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
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
    backgroundColor: CARD_PURPLE,
  },
  card: {
    flex: 1,
    backgroundColor: CARD_PURPLE,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  cardInner: {
    flex: 1,
    gap: Spacing.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  handle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.85)',
  },
  answerText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 30,
    lineHeight: 40,
    color: Colors.white,
    letterSpacing: -0.5,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  actionBtn: {
    height: 48,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  replyBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  metooBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    gap: 6,
  },
  metooBtnLiked: {
    backgroundColor: 'rgba(255, 80, 140, 0.25)',
    borderColor: 'rgba(255, 100, 160, 0.5)',
  },
  metooBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: 'rgba(255,255,255,0.8)',
  },
  metooBtnTextLiked: {
    color: '#ff5090',
  },
  metooBtnLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  metooBtnLabelLiked: {
    color: '#ff80b0',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: Colors.white,
    width: 18,
    borderRadius: 3,
  },
  closeBtn: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.white,
  },
});
