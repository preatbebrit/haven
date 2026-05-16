import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GenderAvatar, getAvatarColors } from '@/components/ui/gender-avatar';
import type { ChatUser } from '@/constants/mock-chat';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DOT_COUNT = 3;
const DOT_SIZE = 7;
const DOT_GAP = 4;
const STAGGER_MS = 140;
const LIFT_MS = 200;
const REST_MS = 320;
const AMPLITUDE = 6;

type Props = {
  member: ChatUser;
};

export function TypingIndicator({ member }: Props) {
  const { colors } = useTheme();
  const { bg, symbol } = getAvatarColors(member.handle);

  return (
    <Animated.View
      style={styles.row}
      entering={bubbleEntering}
      exiting={bubbleExiting}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`@${member.handle} is typing`}
    >
      <View style={styles.avatarSlot}>
        <GenderAvatar symbol={member.avatarSymbol} size={32} bgColor={bg} symbolColor={symbol} />
      </View>
      <View style={[styles.bubble, { backgroundColor: colors.gray100 }]}>
        {Array.from({ length: DOT_COUNT }).map((_, i) => (
          <Dot key={i} index={i} color={colors.textSecondary} />
        ))}
      </View>
    </Animated.View>
  );
}

function Dot({ index, color }: { index: number; color: string }) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withDelay(
      index * STAGGER_MS,
      withRepeat(
        withSequence(
          withTiming(-AMPLITUDE, { duration: LIFT_MS, easing: Easing.out(Easing.cubic) }),
          withSpring(0, { damping: 12, stiffness: 240, mass: 0.55 }),
          withDelay(REST_MS, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      ),
    );
  }, [index, offset]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: color, marginLeft: index === 0 ? 0 : DOT_GAP },
        animStyle,
      ]}
    />
  );
}

function bubbleEntering() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.85 }] },
    animations: {
      opacity: withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
      transform: [{ scale: withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) }) }],
    },
  };
}

function bubbleExiting() {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ scale: 1 }] },
    animations: {
      opacity: withTiming(0, { duration: 140, easing: Easing.in(Easing.quad) }),
      transform: [{ scale: withTiming(0.85, { duration: 160, easing: Easing.in(Easing.quad) }) }],
    },
  };
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  avatarSlot: { width: 32, height: 32 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 24,
    minHeight: 36,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Colors.gray40,
  },
});
