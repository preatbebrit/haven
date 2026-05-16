import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Svg, { Path } from 'react-native-svg';

import { getChatState } from '@/lib/chat-state-storage';
import {
  getChatContentForId,
  getChatUserByHandle,
  groupMemberToChatUser,
  MOCK_CHAT_CONTENT_BY_ID,
} from '@/constants/mock-chat-content';
import { getEffectivePromptColors, MOCK_GROUP_CARDS } from '@/constants/mock-groups';
import { Colors, FontFamily, type PromptColors, Radius, Spacing, TextStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppHeader } from '@/components/ui/app-header';
import { AutoFitText } from '@/components/ui/auto-fit-text';
import { GenderAvatar, getAvatarColors } from '@/components/ui/gender-avatar';
import type { GenderSymbol } from '@/components/ui/gender-avatar';
import { CloseIcon } from '@/components/ui/icons/close-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ReplyIcon } from '@/components/ui/icons/reply-icon';
import { SegmentedPagination } from '@/components/ui/segmented-pagination';
import { useActiveChat } from '@/contexts/active-chat-context';
import { useCurrentUser } from '@/contexts/current-user-context';
import { addAnswerLike, getAnswerLikes } from '@/lib/answer-likes-storage';
import { addPendingConnection } from '@/lib/pending-connections';
import { setPendingReplyTarget } from '@/lib/pending-reply';
import { getPromptAnswerForGroup } from '@/lib/prompt-answer-storage';

function LikeIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 18.3322 18.2833" width={18} height={18} fill="none">
      <Path
        d="M12.8597 1C13.833 1.00484 14.8271 1.40991 15.8294 2.18945C17.0606 3.14701 17.4516 4.46798 17.3031 5.83008C17.1613 7.12977 16.5348 8.48827 15.7416 9.75391C14.1456 12.3001 11.6406 14.8325 9.81871 16.4014L9.16636 16.9639L8.51304 16.4014C6.69111 14.8325 4.18602 12.3002 2.59019 9.75391C1.797 8.4883 1.17136 7.12974 1.02964 5.83008C0.881209 4.46798 1.2721 3.147 2.50328 2.18945C3.5056 1.41002 4.49976 1.00482 5.473 1C6.45857 0.995196 7.27815 1.40151 7.91734 1.96582C8.42104 2.41054 8.8332 2.97114 9.16636 3.56445C9.49947 2.97116 9.91176 2.41053 10.4154 1.96582C11.0546 1.4015 11.8741 0.995119 12.8597 1Z"
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
}

function LikeFilledIcon({ stroke }: { stroke: string }) {
  return (
    <Svg viewBox="0 0 18.3322 18.2833" width={18} height={18} fill="none">
      <Path
        d="M12.8597 1C13.833 1.00484 14.8271 1.40991 15.8294 2.18945C17.0606 3.14701 17.4516 4.46798 17.3031 5.83008C17.1613 7.12977 16.5348 8.48827 15.7416 9.75391C14.1456 12.3001 11.6406 14.8325 9.81871 16.4014L9.16636 16.9639L8.51304 16.4014C6.69111 14.8325 4.18602 12.3002 2.59019 9.75391C1.797 8.4883 1.17136 7.12974 1.02964 5.83008C0.881209 4.46798 1.2721 3.147 2.50328 2.18945C3.5056 1.41002 4.49976 1.00482 5.473 1C6.45857 0.995196 7.27815 1.40151 7.91734 1.96582C8.42104 2.41054 8.8332 2.97114 9.16636 3.56445C9.49947 2.97116 9.91176 2.41053 10.4154 1.96582C11.0546 1.4015 11.8741 0.995119 12.8597 1Z"
        fill={Colors.magenta}
        stroke={stroke}
        strokeWidth={2}
      />
    </Svg>
  );
}

const CARD_LEFT_PADDING = 32;
const CARD_GAP = 16;

type AnswerCard = {
  id: string;
  handle: string;
  pronouns: string;
  avatarColor: string;
  avatarSymbol: GenderSymbol;
  answer: string;
};

/**
 * Build the answer carousel for a given chat id by intersecting the card's
 * member list with the per-chat `answersByHandle` map. The simulated joiner
 * (when registered for the chat) is floated to the top so their answer is the
 * first card the user sees.
 */
function buildAnswerCards(chatId: string): AnswerCard[] {
  const card = MOCK_GROUP_CARDS.find((g) => g.id === chatId) ?? MOCK_GROUP_CARDS[0];
  const content = getChatContentForId(card.id) ?? MOCK_CHAT_CONTENT_BY_ID[MOCK_GROUP_CARDS[0].id];
  const answers = content.answersByHandle;
  const cards: AnswerCard[] = card.members
    .map(groupMemberToChatUser)
    .filter((u) => !!answers[u.handle])
    .map((u) => ({
      id: u.id,
      handle: u.handle,
      pronouns: u.pronouns ?? '',
      avatarColor: u.avatarColor,
      avatarSymbol: u.avatarSymbol,
      answer: answers[u.handle]!,
    }));
  // The simulated late-joiner isn't in card.members yet — pull them from the
  // global directory and append their answer too. Floated to the top.
  const joiner = getChatUserByHandle(content.simJoinHandle);
  if (joiner && answers[joiner.handle]) {
    cards.unshift({
      id: joiner.id,
      handle: joiner.handle,
      pronouns: joiner.pronouns ?? '',
      avatarColor: joiner.avatarColor,
      avatarSymbol: joiner.avatarSymbol,
      answer: answers[joiner.handle]!,
    });
  }
  return cards;
}

function AnswerCardItem({
  item,
  index,
  totalCount,
  cardWidth,
  cardGap,
  snapInterval,
  isLast,
  onLike,
  onReply,
  liked,
  promptColors,
  introScale,
  introOpacity,
  introStackProgress,
  scrollOffset,
}: {
  item: AnswerCard;
  index: number;
  totalCount: number;
  cardWidth: number;
  cardGap: number;
  snapInterval: number;
  isLast: boolean;
  onLike: (id: string) => void;
  onReply: (id: string) => void;
  liked: boolean;
  promptColors: PromptColors;
  introScale: SharedValue<number>;
  introOpacity: SharedValue<number>;
  introStackProgress: SharedValue<number>;
  scrollOffset: SharedValue<number>;
}) {
  const scale = useSharedValue(1);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Every card scales based on its distance from the currently-focused card:
  // centered = 1.0, off-center = 0.8, with a smooth interpolation in between
  // as the user drags. The first two cards additionally get the intro pulse
  // (multiplied onto focus scale); the second card also slides in from behind
  // the first and fades in.
  const stackOffset = cardWidth + cardGap;
  const isFirst = index === 0;
  const isSecond = index === 1;
  const hasIntroPulse = isFirst || isSecond;
  const introStyle = useAnimatedStyle(() => {
    const focusIndex = snapInterval > 0 ? scrollOffset.value / snapInterval : 0;
    const diff = index - focusIndex;
    const distance = Math.min(1, Math.abs(diff));
    const focusScale = 1 - 0.2 * distance;
    const pulse = hasIntroPulse ? introScale.value : 1;
    const scale = focusScale * pulse;
    // Pull each off-center card toward the focused card by half of its own
    // shrinkage, so the visible gap between adjacent cards stays at cardGap.
    const compensation =
      diff === 0 ? 0 : -Math.sign(diff) * (1 - scale) * (cardWidth / 2);
    const stackTx = isSecond ? -stackOffset * (1 - introStackProgress.value) : 0;
    return {
      opacity: isSecond ? introOpacity.value : 1,
      transform: [{ translateX: stackTx + compensation }, { scale }],
    };
  });

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
  // Card 0 sits on top of card 1 while stacked, so the second card emerges
  // from behind it as it slides right. Using a large zIndex + elevation gap
  // to guarantee Android + iOS native ordering honors this.
  const zIndex = index === 0 ? 100 : 1;

  return (
    <Animated.View
      style={[
        {
          zIndex,
          elevation: zIndex,
          marginRight: isLast ? 0 : cardGap,
        },
        introStyle,
      ]}
    >
    <View style={[styles.card, { width: cardWidth, backgroundColor: bg }]}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <View style={styles.avatarRing}>
          {(() => {
            // Seed by handle (not id) so the user's own card matches the
            // /profile avatar — `myCard.id` is `'me'` but every other surface
            // (profile, friends, blocked list) derives colors from the handle.
            const { bg, symbol } = getAvatarColors(item.handle);
            return <GenderAvatar symbol={item.avatarSymbol} size={36} bgColor={bg} symbolColor={symbol} />;
          })()}
        </View>
        <Text style={styles.handle}>
          <Text style={[styles.handleUsername, { color: support }]}>@{item.handle} </Text>
          {item.pronouns ? <Text style={[styles.handlePronouns, { color: support }]}>({item.pronouns})</Text> : null}
        </Text>
      </View>

      {/* Answer */}
      <AutoFitText
        textStyle={[styles.answerText, { color: fg }]}
        maxFontSize={24}
        minFontSize={16}
        lineHeightRatio={32 / 24}
      >
        {item.answer}
      </AutoFitText>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
          onPress={() => onReply(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Reply to @${item.handle}`}
        >
          <ReplyIcon size={24} color={support} />
          <Text style={[styles.actionBtnText, { color: support }]}>Reply</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            liked && styles.actionBtnLiked,
            pressed && !liked && { opacity: 0.8 },
          ]}
          onPress={handleLike}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Liked' : 'Like'}
        >
          <Animated.View style={heartStyle}>
            {liked
              ? <LikeFilledIcon stroke={support} />
              : <LikeIcon color={support} />}
          </Animated.View>
          <Text style={[styles.actionBtnText, { color: support }]}>
            {liked ? 'Liked' : 'Like'}
          </Text>
        </Pressable>
      </View>
    </View>
    </Animated.View>
  );
}

export default function AnswersScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const { joinChat, activeChatId } = useActiveChat();
  const { me } = useCurrentUser();

  // /chat is below /answers when the user arrived via the chat-header prompt
  // icon (chat → /answers as a push). Not in the stack when arriving from the
  // share flow (chat-selection → /prompt → /answers, where /prompt was
  // replaced). The two cases need different exits to avoid a chat-selection
  // bounce when activeChatId is already set.
  const chatInStack = useCallback(() => {
    const state = navigation.getState();
    return state?.routes?.some((r) => r.name === 'chat') ?? false;
  }, [navigation]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [myCard, setMyCard] = useState<AnswerCard | null>(null);

  // Hydrate liked state from storage so likes persist when the user leaves
  // and returns to /answers within the same chat session.
  useEffect(() => {
    const id = (groupId as string | undefined) ?? MOCK_GROUP_CARDS[0].id;
    let cancelled = false;
    void getAnswerLikes(id).then((ids) => {
      if (cancelled) return;
      if (ids.size > 0) setLikedIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [groupId]);
  const [leaverGone, setLeaverGone] = useState(false);
  const [joinerArrived, setJoinerArrived] = useState(false);

  const { promptColors, question, baseCards, simLeaveHandle, simJoinHandle } = useMemo(() => {
    const group = MOCK_GROUP_CARDS.find((g) => g.id === groupId) ?? MOCK_GROUP_CARDS[0];
    const content =
      getChatContentForId(group.id) ?? MOCK_CHAT_CONTENT_BY_ID[MOCK_GROUP_CARDS[0].id];
    return {
      promptColors: getEffectivePromptColors(group),
      question: group.question,
      baseCards: buildAnswerCards(group.id),
      simLeaveHandle: content.simLeaveHandle,
      simJoinHandle: content.simJoinHandle,
    };
  }, [groupId]);

  // The stored answer record carries the answer text; identity fields
  // (handle/pronouns/avatar) come from the live current-user profile so the
  // card always matches onboarding even if the user edits their profile after
  // submitting an answer.
  useEffect(() => {
    const id = (groupId as string | undefined) ?? MOCK_GROUP_CARDS[0].id;
    let cancelled = false;
    getPromptAnswerForGroup(id).then((c) => {
      if (cancelled || !c) return;
      setMyCard({
        id: 'me',
        handle: me.handle,
        pronouns: me.pronouns,
        avatarColor: me.avatarColor,
        avatarSymbol: me.avatarSymbol,
        answer: c.answer,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [groupId, me.handle, me.pronouns, me.avatarColor, me.avatarSymbol]);

  // Mirror the chat's simulated leave/join by reading the persisted rows.
  // /chat writes setChatState on every rows change, so polling AsyncStorage
  // is enough to pick up the events whether /chat is on top, below /answers
  // in the stack, or not mounted at all. Each event corresponds to a
  // system-* row keyed by its memberHandle.
  useEffect(() => {
    const chatId = (groupId as string | undefined) ?? MOCK_GROUP_CARDS[0].id;
    let cancelled = false;
    const check = async () => {
      const state = await getChatState(chatId);
      if (cancelled) return;
      const rows = state?.rows ?? [];
      setLeaverGone(
        rows.some((r) => r.type === 'system-leave' && r.memberHandle === simLeaveHandle),
      );
      setJoinerArrived(
        rows.some((r) => r.type === 'system-join' && r.memberHandle === simJoinHandle),
      );
    };
    void check();
    const interval = setInterval(check, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [groupId, simLeaveHandle, simJoinHandle]);

  const cards = useMemo(() => {
    let base = baseCards;
    if (leaverGone) base = base.filter((c) => c.handle !== simLeaveHandle);
    if (!joinerArrived) base = base.filter((c) => c.handle !== simJoinHandle);
    return myCard ? [...base, myCard] : base;
  }, [myCard, leaverGone, joinerArrived, baseCards, simLeaveHandle, simJoinHandle]);

  // Card is 317px wide per Figma; clamp to screen if narrow device
  const cardWidth = Math.min(317, width - CARD_LEFT_PADDING - 44);
  const snapInterval = cardWidth + CARD_GAP;

  const onLike = useCallback((id: string) => {
    setLikedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      const card = cards.find((c) => c.id === id);
      if (card) {
        addPendingConnection({
          handle: card.handle,
          pronouns: card.pronouns,
          avatarColor: card.avatarColor,
          avatarSymbol: card.avatarSymbol,
          answer: card.answer,
          question,
          promptColors,
        });
      }
      const chatId = (groupId as string | undefined) ?? MOCK_GROUP_CARDS[0].id;
      void addAnswerLike(chatId, id);
      return next;
    });
  }, [cards, question, promptColors, groupId]);

  const onReply = useCallback(
    async (id: string) => {
      const card = cards.find((c) => c.id === id);
      if (!card) return;
      // Stash the answer payload — chat arms replyingTo against it on focus
      // but doesn't insert the connection card until the reply is sent.
      setPendingReplyTarget({
        handle: card.handle,
        pronouns: card.pronouns,
        avatarColor: card.avatarColor,
        avatarSymbol: card.avatarSymbol,
        answer: card.answer,
        question,
        promptColors,
        viaReply: true,
      });
      if (activeChatId) {
        // Already joined — if chat is below us in the stack (chat → /answers
        // push), pop. Otherwise (share → /answers replace), replace into
        // /chat directly so we don't flash chat-selection.
        if (chatInStack()) router.back();
        else router.replace('/chat');
      } else {
        // Legacy fallback for any path that lands on /answers without joining
        // first. With the new share-time join in /prompt, this branch is
        // unreachable from the share flow.
        await joinChat(groupId ?? MOCK_GROUP_CARDS[0].id);
        router.replace('/chat');
      }
    },
    [cards, question, promptColors, activeChatId, joinChat, groupId, router, chatInStack],
  );

  async function handleClose() {
    // If the user is already in this chat, choose between popping (chat →
    // /answers push: /chat is below us) and replacing (share → /answers:
    // chat-selection is below us, replacing avoids a visible bounce).
    // Re-joining is avoided in both cases — it would reset the countdown
    // and replay the welcome drip from scratch.
    if (activeChatId) {
      if (chatInStack()) router.back();
      else router.replace('/chat');
      return;
    }
    // Legacy fallback — share flow now joins at /prompt so this is only
    // hit by paths that bypass the new share-time join.
    await joinChat(groupId ?? MOCK_GROUP_CARDS[0].id);
    router.replace('/chat');
  }

  // Entrance animation — plays once per mount. The second card (index 1)
  // starts stacked on top of card 0 at a smaller scale. It scales up
  // dramatically, then slides right into its normal peek position while
  // settling back to 1.0 scale. All other cards render at rest.
  const introScale = useSharedValue(0.85);
  const introOpacity = useSharedValue(0);
  const introStackProgress = useSharedValue(0);

  useEffect(() => {
    introOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    introScale.value = withSequence(
      withTiming(1.12, { duration: 250, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }),
    );
    introStackProgress.value = withDelay(
      250,
      withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }),
    );
  }, [introOpacity, introScale, introStackProgress]);

  // Live scroll offset drives focus-scale on each card and the pagination bars.
  const scrollOffset = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollOffset.value = e.contentOffset.x;
    },
  });
  // Pagination bars track continuous scroll position in units of card indices.
  const pagerProgress = useDerivedValue(() =>
    snapInterval > 0 ? scrollOffset.value / snapInterval : 0,
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[
          styles.screen,
          {
            backgroundColor: colors.backgroundPrimary,
            paddingBottom: Math.max(insets.bottom, Spacing.lg),
          },
        ]}
      >
        <AppHeader
          left={{
            kind: 'icon',
            icon: <CloseIcon size={24} color={colors.textPrimaryInverted} />,
            onPress: handleClose,
            accessibilityLabel: 'Close',
          }}
          center={{ kind: 'title', title: 'Answers' }}
          right={{ kind: 'spacer' }}
        />
        <Animated.ScrollView
          horizontal
          snapToInterval={snapInterval}
          snapToAlignment="start"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          bounces={false}
          // Right padding must let the LAST card snap to `paddingLeft`. Required
          // content width is (count-1)*snapInterval + viewport; the natural
          // value is (viewport - leftPadding - cardWidth). A fixed 32 was too
          // small, so the last snap point fell past max scroll and the
          // scrollview oscillated near the boundary — the pagination bars then
          // resized continuously and could momentarily peek off the edge.
          contentContainerStyle={[
            styles.listContent,
            { paddingRight: Math.max(CARD_LEFT_PADDING, width - CARD_LEFT_PADDING - cardWidth) },
          ]}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          {cards.map((item, index) => (
            <AnswerCardItem
              key={item.id}
              item={item}
              index={index}
              totalCount={cards.length}
              cardWidth={cardWidth}
              cardGap={CARD_GAP}
              snapInterval={snapInterval}
              isLast={index === cards.length - 1}
              onLike={onLike}
              onReply={onReply}
              liked={likedIds.has(item.id)}
              promptColors={promptColors}
              introScale={introScale}
              introOpacity={introOpacity}
              introStackProgress={introStackProgress}
              scrollOffset={scrollOffset}
            />
          ))}
        </Animated.ScrollView>

        {/* Segmented progress indicator — widths + colors interpolate with pagerProgress */}
        <View style={styles.pagination}>
          <SegmentedPagination count={cards.length} progress={pagerProgress} />
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

  // ── List ──────────────────────────────────────────────────────────────────
  // paddingRight is set dynamically on the ScrollView (depends on viewport
  // width and cardWidth) so the last card can snap to the start position.
  listContent: {
    paddingLeft: CARD_LEFT_PADDING,
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
  avatarRing: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.white,
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
    gap: Spacing.lg,
  },
  actionBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnLiked: {},
  actionBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
  },

  // ── Pagination ────────────────────────────────────────────────────────────
  pagination: {
    paddingHorizontal: CARD_LEFT_PADDING,
    paddingVertical: Spacing.md,
  },
});
