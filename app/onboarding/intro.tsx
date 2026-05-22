import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  interpolateColor,
  runOnJS,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { useAuth } from '@/contexts/auth-context';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const tutorialImage1 = require('@/assets/images/tutorial-1.png');
const tutorialImage2 = require('@/assets/images/tutorial-2.png');
const tutorialImage3 = require('@/assets/images/tutorial-3.png');

type Slide = {
  id: string;
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    title: 'Join a chat',
    subtitle: "Find a group that's right for you.",
    image: tutorialImage1,
  },
  {
    id: '2',
    title: 'Answer the prompt',
    subtitle: 'Get the conversation started and learn a little about each member of the chat.',
    image: tutorialImage2,
  },
  {
    id: '3',
    title: 'Hang out for a week',
    subtitle:
      'After a week, you get moved to a new chat. You can choose to keep in touch with people from the chat.',
    image: tutorialImage3,
  },
];

const BAR_GAP = 4;
// Vertical space reserved between the illustration and the copy on each page;
// the progress bar floats over this band so it stays fixed while pages scroll.
const PROGRESS_BAND_HEIGHT = Spacing.lg + 4 + Spacing.lg;

export default function OnboardingIntroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { session, updateProfilePublic } = useAuth();
  const [pageWidth, setPageWidth] = useState(0);
  const [progressTop, setProgressTop] = useState(0);
  // Slide 0 starts visible, so it counts as seen on mount. Once all three are
  // in the set, the Next button activates and stays active even on swipe-back.
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]));
  const allSeen = seen.size === SLIDES.length;

  const scrollX = useSharedValue(0);
  const pageWidthSV = useSharedValue(0);
  const progress = useDerivedValue(() =>
    pageWidthSV.value === 0 ? 0 : scrollX.value / pageWidthSV.value,
  );

  const markSeen = useCallback((index: number) => {
    setSeen((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
    onMomentumEnd: (event) => {
      if (pageWidthSV.value === 0) return;
      const idx = Math.round(event.contentOffset.x / pageWidthSV.value);
      runOnJS(markSeen)(idx);
    },
  });

  const handleNext = useCallback(async () => {
    if (!allSeen) return;
    if (session) {
      const { error } = await supabase
        .from('profiles_public')
        .update({ intro_seen: true })
        .eq('id', session.user.id);
      if (error) {
        // Surface but don't block — the user can keep going; we'll re-show
        // the intro next launch (boot gate reads intro_seen off the loaded
        // profile, so a missed write is recoverable).
        Alert.alert("Couldn't save. We'll try again next time.");
      } else {
        updateProfilePublic({ intro_seen: true });
      }
    }
    router.replace('/(tabs)/chat-selection');
  }, [allSeen, router, session, updateProfilePublic]);

  const onPagerLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== pageWidth) {
      setPageWidth(w);
      pageWidthSV.value = w;
    }
  };

  const onProgressBandLayout = (e: LayoutChangeEvent) => {
    const y = e.nativeEvent.layout.y;
    if (y !== progressTop) setProgressTop(y);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.backgroundPrimary, paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.pagerHost} onLayout={onPagerLayout}>
        <Animated.ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          bounces={false}
        >
          {SLIDES.map((s, i) => (
            <View key={s.id} style={[styles.page, { width: pageWidth }]}>
              <View style={styles.illustrationHost}>
                <Image
                  source={s.image}
                  style={styles.tutorialImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.copyHost}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{s.title}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{s.subtitle}</Text>
              </View>
              <View
                style={styles.progressBand}
                onLayout={i === 0 ? onProgressBandLayout : undefined}
              />
            </View>
          ))}
        </Animated.ScrollView>

        {pageWidth > 0 ? (
          <View
            style={[
              styles.progressOverlay,
              { top: progressTop, height: PROGRESS_BAND_HEIGHT },
            ]}
            pointerEvents="none"
          >
            <ProgressRow
              count={SLIDES.length}
              progress={progress}
              inactiveColor={colors.gray80}
              activeColor={colors.textPrimary}
            />
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.md),
            borderTopColor: colors.gray100,
          },
        ]}
      >
        <PrimaryNextButton
          label="Next"
          inactive={!allSeen}
          onPress={() => void handleNext()}
        />
      </View>
    </View>
  );
}

function ProgressRow({
  count,
  progress,
  inactiveColor,
  activeColor,
}: {
  count: number;
  progress: SharedValue<number>;
  inactiveColor: string;
  activeColor: string;
}) {
  const [width, setWidth] = useState(0);
  const available = Math.max(0, width - (count - 1) * BAR_GAP);

  return (
    <View
      style={styles.progressRow}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w !== width) setWidth(w);
      }}
    >
      {available > 0
        ? Array.from({ length: count }).map((_, i) => (
            <AnimatedBar
              key={i}
              index={i}
              count={count}
              available={available}
              progress={progress}
              inactiveColor={inactiveColor}
              activeColor={activeColor}
            />
          ))
        : null}
    </View>
  );
}

function AnimatedBar({
  index,
  count,
  available,
  progress,
  inactiveColor,
  activeColor,
}: {
  index: number;
  count: number;
  available: number;
  progress: SharedValue<number>;
  inactiveColor: string;
  activeColor: string;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    let totalFlex = 0;
    const flexes: number[] = [];
    for (let i = 0; i < count; i++) {
      const weight = Math.max(0, 1 - Math.abs(progress.value - i));
      const flex = 1 + 2 * weight;
      flexes.push(flex);
      totalFlex += flex;
    }
    const barWidth = (flexes[index] / totalFlex) * available;
    const myWeight = Math.max(0, 1 - Math.abs(progress.value - index));
    const bg = interpolateColor(myWeight, [0, 1], [inactiveColor, activeColor]);
    return { width: barWidth, backgroundColor: bg };
  });
  return <Animated.View style={[styles.segment, animatedStyle]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  pagerHost: { flex: 1 },
  page: {
    paddingHorizontal: Spacing.lg,
  },
  illustrationHost: {
    flex: 1,
    minHeight: 260,
    maxHeight: 360,
    overflow: 'hidden',
  },
  tutorialImage: { width: '100%', height: '100%' },
  progressBand: {
    height: PROGRESS_BAND_HEIGHT,
  },
  progressOverlay: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BAR_GAP,
  },
  segment: {
    height: 4,
    borderRadius: 2,
  },
  copyHost: {},
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 40,
    lineHeight: 44,
    color: Colors.black,
    letterSpacing: -2.4,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.gray40,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray100,
  },
});
