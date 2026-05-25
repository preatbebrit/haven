import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { AppHeader } from '@/components/ui/app-header';
import { getEffectivePromptColors, MOCK_GROUP_CARDS } from '@/constants/mock-groups';
import { Colors, FontFamily, FontSize, Radius, Spacing, TextStyle } from '@/constants/theme';
import { useActiveChat } from '@/contexts/active-chat-context';
import { useCurrentUser } from '@/contexts/current-user-context';
import { useTheme } from '@/hooks/use-theme';
import { setPromptAnswerForGroup } from '@/lib/prompt-answer-storage';
import {
  clearPromptTransitionSource,
  getPromptTransitionSource,
  type PromptTransitionSource,
} from '@/lib/prompt-transition';

const MAX_CHARS = 300;
const ENTER_DURATION = 320;
const EXIT_DURATION = 280;
const MORPH_EASING = Easing.bezier(0.32, 0.72, 0, 1);

// Bounce is a single shared value (0 = neutral, 1 = squeezed in, <0 = popped out)
// applied as a uniform scale on the morph container, used at both ends:
//  • Forward: squeeze briefly before the grow (anticipation).
//  • Reverse: squeeze on landing, then small pop-out, settle.
const BOUNCE_PINCH_AMOUNT = 0.08;
// Forward (anticipation)
const ANTICIPATION_PINCH_DURATION = 90;
const ANTICIPATION_RELEASE_DURATION = 220;
// Reverse (snap-back) — intentionally much subtler than the forward pinch.
// Bounce only ramps to SNAP_PINCH_PEAK (not 1), so the effective scale change
// is SNAP_PINCH_PEAK × BOUNCE_PINCH_AMOUNT.
const SNAP_PINCH_PEAK = 0.3;
const SNAP_PINCH_DURATION = 70;
const SNAP_SETTLE_DURATION = 200;
// Back-out cubic: when settling, dips briefly below 0 (small outward pop).
const SNAP_SETTLE_EASING = Easing.bezier(0.34, 1.45, 0.64, 1);

export default function PromptScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { me } = useCurrentUser();
  if (!me) return null;
  const { joinChat } = useActiveChat();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [answer, setAnswer] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // Read source rect once on first render and clear immediately so a stale rect
  // can't be reused on a subsequent push.
  const [source] = useState<PromptTransitionSource>(() => {
    const s = getPromptTransitionSource();
    if (s) clearPromptTransitionSource();
    return s;
  });
  const hasSource = source !== null;

  const group = useMemo(
    () => MOCK_GROUP_CARDS.find((g) => g.id === id) ?? MOCK_GROUP_CARDS[0],
    [id],
  );

  const { bg, fg, support } = getEffectivePromptColors(group);
  const isLightBg = support === Colors.black;
  const length = answer.length;
  const canShare = length > 0 && length <= MAX_CHARS;

  // 0 = at tile rect; 1 = at full screen.
  const progress = useSharedValue(hasSource ? 0 : 1);
  // 0 = no bounce; >0 squeezes inward, <0 pops outward.
  const bounce = useSharedValue(0);
  const [interactive, setInteractive] = useState(!hasSource);
  const isExitingRef = useRef(false);

  useEffect(() => {
    if (!hasSource) return;
    // Anticipation: squeeze the tile briefly before it expands.
    bounce.value = withSequence(
      withTiming(1, { duration: ANTICIPATION_PINCH_DURATION, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: ANTICIPATION_RELEASE_DURATION, easing: Easing.out(Easing.cubic) }),
    );
    // Geometric expansion starts once the squeeze peaks.
    progress.value = withDelay(
      ANTICIPATION_PINCH_DURATION,
      withTiming(1, { duration: ENTER_DURATION, easing: MORPH_EASING }, (finished) => {
        if (finished) runOnJS(setInteractive)(true);
      }),
    );
  }, [hasSource, progress, bounce]);

  function handleBack() {
    if (isExitingRef.current) return;
    if (!hasSource) {
      router.back();
      return;
    }
    isExitingRef.current = true;
    setInteractive(false);
    cancelAnimation(progress);
    cancelAnimation(bounce);
    progress.value = withTiming(0, { duration: EXIT_DURATION, easing: MORPH_EASING });
    // Bounce in parallel: squeeze peaks as the contract lands, then settles
    // with a small back-out pop.
    bounce.value = withSequence(
      withDelay(
        EXIT_DURATION - SNAP_PINCH_DURATION,
        withTiming(SNAP_PINCH_PEAK, {
          duration: SNAP_PINCH_DURATION,
          easing: Easing.out(Easing.quad),
        }),
      ),
      withTiming(0, { duration: SNAP_SETTLE_DURATION, easing: SNAP_SETTLE_EASING }, (finished) => {
        if (finished) runOnJS(router.back)();
      }),
    );
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSource]);

  const handleShare = async () => {
    if (!canShare) return;
    // Must await: /answers reads this record on mount, and firing-and-forgetting
    // races with the navigation — the next screen gets the previous session's
    // value instead of the answer the user just typed.
    await setPromptAnswerForGroup(group.id, {
      handle: me.handle,
      pronouns: me.pronouns,
      avatarColor: me.avatarColor,
      avatarSymbol: me.avatarSymbol,
      answer: answer.trim(),
    });
    // Share is the join action: this persists activeChatId, so a cold-launch
    // reload while still on /answers will boot into /chat instead of bouncing
    // back to chat-selection. Side effect: the 7-day countdown and the
    // welcome-message drip start ticking from this moment, even if the user
    // lingers on /answers before opening /chat.
    await joinChat(group.id);
    router.replace({ pathname: '/answers', params: { groupId: group.id } });
  };

  function handleChangeText(t: string) {
    setAnswer(t.slice(0, MAX_CHARS));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 0);
  }

  const containerStyle = useAnimatedStyle(() => {
    if (!source) {
      return { left: 0, top: 0, width: screenW, height: screenH, borderRadius: 0 };
    }
    const r = source.rect;
    const scale = 1 - bounce.value * BOUNCE_PINCH_AMOUNT;
    return {
      left: interpolate(progress.value, [0, 1], [r.x, 0]),
      top: interpolate(progress.value, [0, 1], [r.y, 0]),
      width: interpolate(progress.value, [0, 1], [r.width, screenW]),
      height: interpolate(progress.value, [0, 1], [r.height, screenH]),
      borderRadius: interpolate(progress.value, [0, 0.5, 1], [Radius.md, 28, 0]),
      transform: [{ scale }],
    };
  });

  const tileContentStyle = useAnimatedStyle(() => ({
    opacity: hasSource ? interpolate(progress.value, [0, 0.45], [1, 0], 'clamp') : 0,
  }));

  const screenLayerStyle = useAnimatedStyle(() => ({
    opacity: hasSource ? interpolate(progress.value, [0.55, 1], [0, 1], 'clamp') : 1,
  }));

  return (
    <View style={styles.flex}>
      <StatusBar style={isLightBg ? 'dark' : 'light'} />

      {/* ── Animated morph container — paints the bg from tile rect to full screen ── */}
      <Animated.View
        pointerEvents="none"
        style={[styles.morph, containerStyle, { backgroundColor: bg }]}
      >
        <View
          style={[
            styles.tileInner,
            source ? { width: source.rect.width, height: source.rect.height } : null,
          ]}
        >
          <Animated.View style={[styles.tileContent, tileContentStyle]}>
            <View style={styles.tileMeta}>
              <Text style={[styles.tileLabel, { color: fg }]}>Prompt</Text>
              <Text style={[styles.tileActive, { color: support }]}>{group.activeLabel}</Text>
            </View>
            <Text style={[styles.tileQuestion, { color: fg }]}>{group.question}</Text>
          </Animated.View>
        </View>
      </Animated.View>

      {/* ── Screen-shape content — overlaid, fades in once morph completes ── */}
      <Animated.View
        style={[styles.screenLayer, screenLayerStyle]}
        pointerEvents={interactive ? 'box-none' : 'none'}
      >
        <AppHeader
          left={{
            kind: 'icon',
            icon: <Ionicons name="chevron-back" size={22} color={colors.textPrimaryInverted} />,
            onPress: handleBack,
            accessibilityLabel: 'Go back',
          }}
          right={{ kind: 'spacer' }}
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.screenContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topRow}>
              <Text style={[styles.promptLabel, { color: fg }]}>Prompt</Text>
              <Text style={[styles.counter, { color: support }]}>
                {length}/{MAX_CHARS}
              </Text>
            </View>

            <Text style={[styles.question, { color: fg }]}>{group.question}</Text>

            <TextInput
              style={[
                styles.input,
                {
                  color: support,
                  backgroundColor: isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.2)',
                  borderColor: isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)',
                },
              ]}
              value={answer}
              onChangeText={handleChangeText}
              placeholder="Share honestly — this is your space."
              placeholderTextColor={isLightBg ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.45)'}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              maxLength={MAX_CHARS}
              autoCorrect
              accessibilityLabel="Your answer to the prompt"
            />
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(insets.bottom, Spacing.md),
                borderTopColor: isLightBg
                  ? 'rgba(0,0,0,0.1)'
                  : 'rgba(255,255,255,0.15)',
              },
            ]}
          >
            <PrimaryNextButton
              label="Share with chat"
              inactive={!canShare}
              onPress={handleShare}
            />
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // ── Morph container ──────────────────────────────────────────────────────
  morph: {
    position: 'absolute',
    overflow: 'hidden',
  },
  // Pinned to top-left so contents don't reflow as the container grows.
  tileInner: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  tileContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: 4,
  },
  tileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 20,
  },
  tileActive: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },
  tileQuestion: {
    ...TextStyle.h2,
  },

  // ── Screen layer ─────────────────────────────────────────────────────────
  screenLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  screenContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  promptLabel: {
    ...TextStyle.body,
  },
  counter: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    opacity: 0.85,
  },
  question: {
    fontFamily: FontFamily.semiBold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -1.28,
    marginBottom: Spacing.lg,
  },
  input: {
    minHeight: 160,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
    lineHeight: 28,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },

  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
