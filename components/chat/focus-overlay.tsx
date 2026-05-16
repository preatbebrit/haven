import { useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import Svg, { Path } from 'react-native-svg';

import { MessageBubbleContent } from '@/components/chat/message-bubble-content';
import { CloseIcon } from '@/components/ui/icons/close-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ReplyIcon } from '@/components/ui/icons/reply-icon';
import type { MockChatMessage } from '@/constants/mock-chat';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';

function WarningIcon({ color = Colors.cherry, size = 24 }: { color?: string; size?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path
        d="M10.268 3.5a2 2 0 0 1 3.464 0l8.124 14.077A2 2 0 0 1 20.124 20.5H3.876a2 2 0 0 1-1.732-2.923z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M12 9.75V13.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 16.75h.01" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

export type FocusTarget = {
  message: MockChatMessage;
  rect: { x: number; y: number; width: number; height: number };
};

type Props = {
  focus: FocusTarget | null;
  onReply: () => void;
  onReport: () => void;
  onClose: () => void;
};

const MENU_HEIGHT_ESTIMATE = 100;
const MENU_GAP = 12;
const OPEN = { duration: 220, easing: Easing.out(Easing.cubic) } as const;
const CLOSE = { duration: 180, easing: Easing.in(Easing.cubic) } as const;

export function FocusOverlay({ focus, onReply, onReport, onClose }: Props) {
  if (!focus) return null;
  return <FocusOverlayBody focus={focus} onReply={onReply} onReport={onReport} onClose={onClose} />;
}

function FocusOverlayBody({ focus, onReply, onReport, onClose }: { focus: FocusTarget } & Omit<Props, 'focus'>) {
  const { height: windowHeight } = useWindowDimensions();
  const { rect } = focus;
  const menuBelow = rect.y + rect.height + MENU_GAP + MENU_HEIGHT_ESTIMATE < windowHeight - 40;

  const backdrop = useSharedValue(0);
  const scale = useSharedValue(1);
  const menuOpacity = useSharedValue(0);
  const menuTranslate = useSharedValue(menuBelow ? -6 : 6);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    backdrop.value = withTiming(1, OPEN);
    scale.value = withSpring(1.05, { damping: 12, stiffness: 350 });
    menuOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
    menuTranslate.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
  }, []);

  const handleClose = useCallback(() => {
    const closeCb = onCloseRef.current;
    backdrop.value = withTiming(0, CLOSE);
    menuOpacity.value = withTiming(0, { duration: 140 });
    scale.value = withTiming(1, { duration: 160 }, (done) => {
      'worklet';
      if (done) runOnJS(closeCb)();
    });
  }, []);

  const handleReply = useCallback(() => {
    onReply();
  }, [onReply]);

  const handleReport = useCallback(() => {
    onReport();
  }, [onReport]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const bubbleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const menuStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value,
    transform: [{ translateY: menuTranslate.value }],
  }));

  const menuTop = menuBelow
    ? rect.y + rect.height + MENU_GAP
    : Math.max(rect.y - MENU_HEIGHT_ESTIMATE - MENU_GAP, 48);

  const isMe = focus.message.authorId === 'me';
  const menuAlign = isMe ? 'flex-end' : 'flex-start';

  return (
    <Modal transparent visible onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
        <View style={styles.closeWrap}>
          <PressableScale
            onPress={handleClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <CloseIcon size={20} color={Colors.white} />
          </PressableScale>
        </View>

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.bubbleClone,
            {
              top: rect.y,
              left: rect.x,
              width: rect.width,
              transformOrigin: isMe ? 'top right' : 'top left',
            },
            bubbleStyle,
          ]}
        >
          <MessageBubbleContent message={focus.message} />
        </Animated.View>

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.menuLayer,
            {
              top: menuTop,
              left: rect.x,
              width: rect.width,
              alignItems: menuAlign,
            },
            menuStyle,
          ]}
        >
          <View style={styles.menu}>
            <Pressable
              onPress={handleReply}
              style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Reply to message"
            >
              <Text style={styles.menuItemText}>Reply</Text>
              <ReplyIcon size={24} color={Colors.white} />
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable
              onPress={handleReport}
              style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Report message"
            >
              <Text style={[styles.menuItemText, { color: Colors.cherry }]}>Report</Text>
              <WarningIcon size={24} color={Colors.cherry} />
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.55)' },
  closeWrap: {
    position: 'absolute',
    top: 54,
    right: 16,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleClone: {
    position: 'absolute',
  },
  menuLayer: {
    position: 'absolute',
  },
  menu: {
    backgroundColor: Colors.black,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    minWidth: 220,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  menuItemText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.32,
    color: Colors.white,
  },
  menuDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
});
