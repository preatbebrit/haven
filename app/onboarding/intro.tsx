import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { markIntroSeen } from '@/lib/intro-storage';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';

type Slide = {
  id: string;
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    title: 'Join a chat',
    subtitle: "Find a group that's right for you.",
  },
  {
    id: '2',
    title: 'Answer the prompt',
    subtitle:
      'Get the conversation started and learn a little about each member of the chat.',
  },
  {
    id: '3',
    title: 'Hang out for a week',
    subtitle:
      'After a week, you get moved to a new chat. You can choose to keep in touch with people from the chat.',
  },
];

export default function OnboardingIntroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / width);
      setIndex(Math.min(Math.max(next, 0), SLIDES.length - 1));
    },
    [width],
  );

  const handleNext = useCallback(async () => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      setIndex(next);
      listRef.current?.scrollToIndex({
        index: next,
        animated: true,
      });
      return;
    }
    await markIntroSeen();
    router.replace('/(tabs)/chat-selection');
  }, [index, router]);

  const renderItem: ListRenderItem<Slide> = useCallback(
    ({ item, index: i }) => (
      <View style={[styles.page, { width }]}>
        <View style={styles.illustration}>{renderIllustration(i)}</View>
        <View style={styles.progressRow} accessibilityRole="adjustable" accessibilityLabel="Intro progress">
          {SLIDES.map((_, si) => (
            <View key={SLIDES[si].id} style={[styles.segment, si === i ? styles.segmentActive : styles.segmentInactive]} />
          ))}
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    ),
    [width],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.md }]}>
      <FlatList
        style={styles.list}
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="center"
        disableIntervalMomentum
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        renderItem={renderItem}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <PrimaryNextButton disabled={false} onPress={() => void handleNext()} />
      </View>
    </View>
  );
}

function renderIllustration(slideIndex: number) {
  switch (slideIndex) {
    case 0:
      return <IllustrationJoinChat />;
    case 1:
      return <IllustrationPrompt />;
    default:
      return <IllustrationChatWeek />;
  }
}

const INCOMING = '#ebe6f7';
const OUTGOING = '#1e4ed8';

function IllustrationJoinChat() {
  return (
    <View style={ill.joinWrap}>
      <View style={[ill.cardBack, ill.cardBackOffset]}>
        <View style={[ill.cardHeader, { backgroundColor: Colors.blue }]}>
          <Text style={ill.cardHeaderPrompt}>Prompt</Text>
          <Text style={ill.cardQ} numberOfLines={2}>
            When do you feel most like yourself?
          </Text>
        </View>
        <View style={ill.cardBody}>
          <Text style={ill.membersLabel}>Members</Text>
          <View style={ill.tagRow}>
            <View style={ill.miniTag}>
              <Text style={ill.miniTagText}>Cis Woman</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={ill.cardFront}>
        <View style={[ill.cardHeader, { backgroundColor: '#5b1fb8' }]}>
          <Text style={ill.cardHeaderPrompt}>Prompt</Text>
          <Text style={ill.cardQ} numberOfLines={2}>
            What is something you are unlearning right now?
          </Text>
        </View>
        <View style={ill.cardBody}>
          <View style={ill.membersRow}>
            <Text style={ill.membersLabel}>Members</Text>
            <Text style={ill.seats}>2 open seats</Text>
          </View>
          {['grover', 'staceygirl', 'xXrkXx'].map((h, i) => (
            <View key={h} style={ill.memberLine}>
              <View style={[ill.avatar, { backgroundColor: ['#ff006a', '#00e9ff', '#c000ff'][i] }]} />
              <Text style={ill.handle}>@{h}</Text>
              <Text style={ill.plus}>+</Text>
            </View>
          ))}
          <View style={ill.tagRow}>
            {['Nonbinary', 'Out', 'Parent'].map((t) => (
              <View key={t} style={ill.miniTag}>
                <Text style={ill.miniTagText}>{t}</Text>
              </View>
            ))}
          </View>
          <View style={ill.joinMini}>
            <Text style={ill.joinMiniText}>Join the chat</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function IllustrationPrompt() {
  return (
    <View style={ill.promptRow}>
      <View style={ill.promptLeft}>
        <Text style={ill.decoEmoji}>🌱</Text>
        <View style={ill.faceCircle} />
        <Text style={ill.heartEmoji}>💖</Text>
        <Text style={ill.powerText}>
          Your words are p<Text style={ill.powerEmoji}>🕶️</Text>wer
        </Text>
      </View>
      <View style={ill.phoneTilt}>
        <View style={ill.phoneInner}>
          <Text style={ill.phonePromptLabel}>Prompt</Text>
          <Text style={ill.phoneQ} numberOfLines={4}>
            I grew up feeling like I had to be quiet, because if I was too loud, people would figure out
            that I was gay...
          </Text>
          <View style={ill.phoneKeyboard} />
        </View>
        <Text style={ill.floatingHeart}>💗</Text>
        <Text style={[ill.floatingHeart, { right: 8, top: 40 }]}>💗</Text>
      </View>
    </View>
  );
}

function IllustrationChatWeek() {
  return (
    <View style={ill.chatWrap}>
      <View style={ill.pill} accessibilityElementsHidden>
        <Text style={ill.pillIcon}>♀️</Text>
        <Text style={ill.pillHandle}>@grover</Text>
      </View>
      <View style={[ill.pill, ill.pillRight]}>
        <Text style={ill.pillIcon}>✳️</Text>
        <Text style={ill.pillHandle}>@staceygirl</Text>
      </View>
      <View style={[ill.pill, ill.pillLeft]}>
        <Text style={ill.pillIcon}>═</Text>
        <Text style={ill.pillHandle}>@xXrkXx</Text>
      </View>
      <View style={ill.chatPhone}>
        <View style={[ill.bubble, ill.bubbleThem]}>
          <Text style={ill.bubbleTextThem}>hey everyone 💜</Text>
        </View>
        <View style={[ill.bubble, ill.bubbleMe]}>
          <Text style={ill.bubbleTextMe}>hiiii nervous to type this</Text>
        </View>
        <View style={[ill.bubble, ill.bubbleThem, { alignSelf: 'flex-start' }]}>
          <Text style={ill.bubbleTextThem}>you&apos;re doing great honestly</Text>
        </View>
      </View>
    </View>
  );
}

const ill = StyleSheet.create({
  joinWrap: {
    flex: 1,
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBack: {
    position: 'absolute',
    width: '78%',
    borderRadius: 16,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardBackOffset: {
    transform: [{ translateX: 36 }, { translateY: -18 }, { rotate: '4deg' }],
    opacity: 0.92,
  },
  cardFront: {
    width: '84%',
    borderRadius: 16,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  cardHeader: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  cardHeaderPrompt: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 4,
  },
  cardQ: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    lineHeight: 14,
    color: '#39ff14',
  },
  cardBody: {
    padding: 10,
    gap: 6,
  },
  membersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  membersLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.black,
  },
  seats: {
    fontFamily: FontFamily.medium,
    fontSize: 9,
    color: Colors.gray40,
  },
  memberLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  handle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.black,
    flex: 1,
  },
  plus: {
    fontSize: 12,
    color: Colors.black,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  miniTag: {
    borderWidth: 1,
    borderColor: Colors.black,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  miniTagText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 8,
    color: Colors.black,
  },
  joinMini: {
    backgroundColor: Colors.black,
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  joinMiniText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.white,
  },
  promptRow: {
    flex: 1,
    minHeight: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  promptLeft: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  decoEmoji: {
    fontSize: 20,
  },
  faceCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray80,
    marginVertical: 4,
  },
  heartEmoji: {
    fontSize: 16,
  },
  powerText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 20,
    lineHeight: 26,
    color: Colors.black,
  },
  powerEmoji: {
    fontSize: 20,
  },
  phoneTilt: {
    width: '48%',
    maxWidth: 160,
    transform: [{ rotate: '-8deg' }],
  },
  phoneInner: {
    backgroundColor: '#3d0f7a',
    borderRadius: 18,
    padding: 10,
    minHeight: 200,
  },
  phonePromptLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: Colors.white,
    opacity: 0.85,
    marginBottom: 6,
  },
  phoneQ: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    lineHeight: 15,
    color: Colors.white,
    flex: 1,
  },
  phoneKeyboard: {
    marginTop: 10,
    height: 56,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  floatingHeart: {
    position: 'absolute',
    fontSize: 14,
    top: 0,
    right: -4,
  },
  chatWrap: {
    flex: 1,
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatPhone: {
    width: '72%',
    maxWidth: 260,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gray80,
    padding: Spacing.md,
    gap: Spacing.sm,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  bubble: {
    maxWidth: '92%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: INCOMING,
    borderBottomLeftRadius: 4,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: OUTGOING,
    borderBottomRightRadius: 4,
  },
  bubbleTextThem: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.black,
  },
  bubbleTextMe: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.white,
  },
  pill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray80,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    top: 12,
    left: 8,
    zIndex: 2,
  },
  pillRight: {
    left: undefined,
    right: 4,
    top: 56,
  },
  pillLeft: {
    left: 12,
    top: undefined,
    bottom: 32,
  },
  pillIcon: {
    fontSize: 14,
  },
  pillHandle: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.black,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  list: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  illustration: {
    flex: 1,
    minHeight: 260,
    maxHeight: 360,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.lg,
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
    flexShrink: 0,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray100,
  },
});
