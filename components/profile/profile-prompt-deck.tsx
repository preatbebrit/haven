import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { AutoFitText } from '@/components/ui/auto-fit-text';
import { GenderAvatar, getAvatarColors, type GenderSymbol } from '@/components/ui/gender-avatar';
import { WindowedPagination } from '@/components/ui/windowed-pagination';
import { Colors, FontFamily, FontSize, Spacing, type PromptColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PromptDeckCard = {
  id: string;
  handle: string;
  pronouns: string;
  avatarSymbol: GenderSymbol;
  question: string;
  answer: string;
  promptColors: PromptColors;
};

type Props = {
  cards: PromptDeckCard[];
  cardWidth: number;
  /**
   * Conceptual total of prompt answers this user has (e.g. chats joined). When
   * larger than `cards.length`, the pagination indicator implies the larger
   * count — the highlight slides across the compressed bars as if the deck
   * held this many cards.
   */
  totalAnswered?: number;
};

const MAX_BARS = 7;

const STACK_X = 28;
const STACK_Y = 12;
const CARD_HEIGHT = 360;

function PromptCard({ card, cardWidth }: { card: PromptDeckCard; cardWidth: number }) {
  const { bg: avatarBg, symbol: avatarSymbol } = getAvatarColors(card.handle);
  return (
    <View style={[styles.promptCard, { width: cardWidth, backgroundColor: card.promptColors.bg }]}>
      <View style={styles.promptAuthorRow}>
        <View style={styles.promptAvatarRing}>
          <GenderAvatar
            symbol={card.avatarSymbol}
            size={24}
            bgColor={avatarBg}
            symbolColor={avatarSymbol}
          />
        </View>
        <Text style={[styles.promptHandle, { color: card.promptColors.support }]}>
          @{card.handle}
        </Text>
      </View>
      <Text style={[styles.promptQuestion, { color: card.promptColors.fg }]}>
        {card.question}
      </Text>
      <AutoFitText
        textStyle={[styles.promptAnswer, { color: card.promptColors.support }]}
        maxFontSize={FontSize.md}
        minFontSize={FontSize.md}
        lineHeightRatio={24 / 16}
      >
        {card.answer}
      </AutoFitText>
    </View>
  );
}

export function ProfilePromptDeck({ cards, cardWidth, totalAnswered }: Props) {
  // swipeCount grows by 1 on every forward swipe. It drives which card is on
  // top (modulo cards.length, so the deck cycles) and the conceptual position
  // in the indicator (modulo indicatorCount, so each swipe moves the
  // highlight to the next bar in the strip).
  const [swipeCount, setSwipeCount] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;
  const { colors } = useTheme();
  // Continuous position fed to the pagination. Each swipe animates this by 1
  // forward; the once-per-cycle wrap snaps without animation.
  const indicatorPosition = useSharedValue(0);

  const deckHeight = CARD_HEIGHT + STACK_Y * 2 + 24;
  const deckWidth = cardWidth + STACK_X * 2 + 16;

  // Conceptual position count — total bars the highlight will eventually
  // traverse (e.g. 20). Only `indicatorBars` of these are visible at once;
  // the rest slide into view as the user swipes.
  const indicatorCount =
    totalAnswered && totalAnswered > cards.length ? totalAnswered : cards.length;
  const indicatorBars = Math.max(1, Math.min(MAX_BARS, indicatorCount));

  // swipeCount can go negative when the user swipes back past the start.
  // positiveMod keeps the card and indicator positions in [0, N) regardless.
  const positiveMod = (n: number, m: number) => (m <= 0 ? 0 : ((n % m) + m) % m);
  const activeIndex = positiveMod(swipeCount, cards.length);
  const conceptualPos = positiveMod(swipeCount, indicatorCount);
  const lastConceptualRef = useRef(0);

  useEffect(() => {
    const prev = lastConceptualRef.current;
    lastConceptualRef.current = conceptualPos;
    // Single-step move (forward OR backward) → smooth slide.
    // Wrap (e.g., N-1 → 0 forward, or 0 → N-1 backward) → snap to avoid a
    // long glide all the way back across the strip.
    if (Math.abs(conceptualPos - prev) > 1) {
      indicatorPosition.value = conceptualPos;
    } else {
      indicatorPosition.value = withTiming(conceptualPos, { duration: 200 });
    }
  }, [conceptualPos, indicatorPosition]);

  const springHome = () => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      tension: 90,
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      // Claim horizontal-dominant moves in the capture phase so the parent
      // ScrollView never has a chance to interpret a diagonal swipe as a
      // vertical scroll. The 1.5x ratio requires a clearly horizontal swipe.
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 6,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, { dx, vx }) => {
        const distanceThreshold = cardWidth * 0.25;
        if (Math.abs(dx) > distanceThreshold || Math.abs(vx) > 0.5) {
          // Right swipe = back (step indicator left); left swipe = forward.
          const step = dx > 0 ? -1 : 1;
          Animated.timing(pan, {
            toValue: { x: dx > 0 ? 600 : -600, y: 0 },
            duration: 220,
            useNativeDriver: false,
          }).start(() => {
            pan.setValue({ x: 0, y: 0 });
            setSwipeCount((prev) => prev + step);
          });
        } else {
          springHome();
        }
      },
      onPanResponderTerminate: () => springHome(),
    }),
  ).current;

  if (cards.length === 0) return null;

  // Single-card mode: no stack siblings, no swipe, no pagination — showing the
  // back of the same card three times reads as a bug, not a deck.
  if (cards.length === 1) {
    return (
      <View style={styles.deckRoot}>
        <View style={styles.deckStackWrap}>
          <View style={{ height: deckHeight, width: deckWidth, alignItems: 'center', justifyContent: 'flex-start' }}>
            <View style={{ marginTop: STACK_Y, transform: [{ rotate: '-3deg' }] }}>
              <PromptCard card={cards[0]} cardWidth={cardWidth} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  const frontCard = cards[activeIndex];
  const midCard = cards[(activeIndex + 1) % cards.length];
  // Only render a back sibling when there are at least 3 cards. With exactly
  // 2, the back position would otherwise duplicate the front card and read as
  // a third card.
  const backCard = cards.length >= 3 ? cards[(activeIndex + 2) % cards.length] : null;

  const rotate = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ['-15deg', '-5deg', '5deg'],
  });

  return (
    <View style={styles.deckRoot}>
      <View style={styles.deckStackWrap}>
        <View style={{ height: deckHeight, width: deckWidth, position: 'relative' }}>
          {backCard ? (
            <View
              style={[
                styles.deckCard,
                { top: STACK_Y * 2, left: STACK_X * 2, zIndex: 1, transform: [{ rotate: '10deg' }] },
              ]}
            >
              <PromptCard card={backCard} cardWidth={cardWidth} />
            </View>
          ) : null}
          <View
            style={[
              styles.deckCard,
              { top: STACK_Y, left: STACK_X, zIndex: 2, transform: [{ rotate: '5deg' }] },
            ]}
          >
            <PromptCard card={midCard} cardWidth={cardWidth} />
          </View>
          <Animated.View
            style={[
              styles.deckCard,
              {
                top: 0,
                left: 0,
                zIndex: 3,
                transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <PromptCard card={frontCard} cardWidth={cardWidth} />
          </Animated.View>
        </View>
      </View>

      <View style={styles.deckPagination}>
        <WindowedPagination
          count={indicatorCount}
          position={indicatorPosition}
          visibleCount={indicatorBars}
          backgroundColor={colors.backgroundPrimary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deckRoot: {
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
  deckStackWrap: {
    alignItems: 'center',
  },
  deckCard: { position: 'absolute' },
  promptCard: {
    height: CARD_HEIGHT,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  promptAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  promptAvatarRing: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  promptHandle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: -0.22,
  },
  promptQuestion: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    lineHeight: 22,
    letterSpacing: -0.32,
  },
  promptAnswer: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    lineHeight: 24,
    letterSpacing: -0.32,
  },
  deckPagination: {
    paddingHorizontal: Spacing.md,
  },
});
