import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  ListRenderItem,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const addFriendCircle = require('@/assets/images/icon-add-friend-circle.png');

function AddFriendIcon() {
  const { colors } = useTheme();
  return (
    <View style={{ width: 24, height: 24 }}>
      <Image source={addFriendCircle} style={{ width: 24, height: 24 }} />
      <View style={{ position: 'absolute', top: 5.67, left: 5.6, width: 12.875, height: 12.875, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] }}>
        <Ionicons name="add" size={13} color={colors.textSecondary} />
      </View>
    </View>
  );
}
function LikeBadge({ size = 24 }: { size?: number }) {
  const heart = size * (14.33 / 24);
  return (
    <View style={[badgeStyles.root, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg viewBox="0 0 18.3322 18.2833" width={heart} height={heart} fill="none">
        <Path
          d="M12.8597 1C13.833 1.00484 14.8271 1.40991 15.8294 2.18945C17.0606 3.14701 17.4516 4.46798 17.3031 5.83008C17.1613 7.12977 16.5348 8.48827 15.7416 9.75391C14.1456 12.3001 11.6406 14.8325 9.81871 16.4014L9.16636 16.9639L8.51304 16.4014C6.69111 14.8325 4.18602 12.3002 2.59019 9.75391C1.797 8.4883 1.17136 7.12974 1.02964 5.83008C0.881209 4.46798 1.2721 3.147 2.50328 2.18945C3.5056 1.41002 4.49976 1.00482 5.473 1C6.45857 0.995196 7.27815 1.40151 7.91734 1.96582C8.42104 2.41054 8.8332 2.97114 9.16636 3.56445C9.49947 2.97116 9.91176 2.41053 10.4154 1.96582C11.0546 1.4015 11.8741 0.995119 12.8597 1Z"
          fill={Colors.magenta}
        />
      </Svg>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  root: {
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});

const BADGE_SIZE = 24;
const BADGE_OVERLAP = 10;

function LikeTip() {
  return (
    <View style={tipStyles.row}>
      <View style={tipStyles.spacer} />
      <View style={tipStyles.content}>
        <Text style={tipStyles.text}>Double tap to like</Text>
        <Svg viewBox="0 0 18.3322 18.2833" width={12} height={12} fill="none">
          <Path
            d="M12.8597 1C13.833 1.00484 14.8271 1.40991 15.8294 2.18945C17.0606 3.14701 17.4516 4.46798 17.3031 5.83008C17.1613 7.12977 16.5348 8.48827 15.7416 9.75391C14.1456 12.3001 11.6406 14.8325 9.81871 16.4014L9.16636 16.9639L8.51304 16.4014C6.69111 14.8325 4.18602 12.3002 2.59019 9.75391C1.797 8.4883 1.17136 7.12974 1.02964 5.83008C0.881209 4.46798 1.2721 3.147 2.50328 2.18945C3.5056 1.41002 4.49976 1.00482 5.473 1C6.45857 0.995196 7.27815 1.40151 7.91734 1.96582C8.42104 2.41054 8.8332 2.97114 9.16636 3.56445C9.49947 2.97116 9.91176 2.41053 10.4154 1.96582C11.0546 1.4015 11.8741 0.995119 12.8597 1Z"
            stroke={Colors.gray40}
            strokeWidth={2}
          />
        </Svg>
      </View>
    </View>
  );
}

function RepliesLink({
  count,
  onPress,
  align,
}: {
  count: number;
  onPress: () => void;
  align: 'left' | 'right';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${count} replies`}
      hitSlop={6}
      style={[
        repliesLinkStyles.root,
        { alignSelf: align === 'right' ? 'flex-end' : 'flex-start' },
      ]}
    >
      <ReplyIcon size={12} color={Colors.blue} />
      <Text style={repliesLinkStyles.text}>
        {count} {count === 1 ? 'reply' : 'replies'}
      </Text>
    </Pressable>
  );
}

const repliesLinkStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  text: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.blue,
    letterSpacing: -0.24,
    textDecorationLine: 'underline',
  },
});

const tipStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: -Spacing.sm, marginBottom: Spacing.sm },
  spacer: { width: 40 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.gray40,
    letterSpacing: -0.64,
  },
});

function LikeStack({
  likerIds,
  onLongPress,
}: {
  likerIds: string[];
  onLongPress: () => void;
}) {
  if (likerIds.length === 0) return null;
  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={300}
      accessibilityRole="button"
      accessibilityLabel={`${likerIds.length} like${likerIds.length === 1 ? '' : 's'}. Long press to see who liked`}
      hitSlop={6}
      style={likeStackStyles.stack}
    >
      {likerIds.map((id, i) => (
        <AnimatedBadge key={id} index={i} />
      ))}
    </Pressable>
  );
}

function AnimatedBadge({ index }: { index: number }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 220 });
  }, [scale]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[
        likeStackStyles.badgeWrap,
        { marginLeft: index === 0 ? 0 : -BADGE_OVERLAP, zIndex: 50 - index },
        animStyle,
      ]}
    >
      <LikeBadge size={BADGE_SIZE} />
    </Animated.View>
  );
}

const likeStackStyles = StyleSheet.create({
  stack: {
    position: 'absolute',
    left: 12,
    bottom: -12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeWrap: {},
});

function PromptIcon({ color = 'white' }: { color?: string }) {
  return (
    <Svg viewBox="0 0 18 22" width={18} height={22} fill="none">
      <Rect x={1} y={1} width={16} height={20} rx={1} stroke={color} strokeWidth={2} />
      <Path
        d="M8.32027 9.045C8.32027 8.565 8.38027 8.15 8.59527 7.77C8.86527 7.23 9.29027 7.095 9.77027 6.585C10.0353 6.29 10.1053 6.005 10.1053 5.655C10.1053 5.4 10.0453 5.18 9.91027 5.015C9.69527 4.745 9.35027 4.65 8.99527 4.65C8.67027 4.65 8.36527 4.735 8.17527 4.915C7.96527 5.09 7.87527 5.355 7.88027 5.655H6.78027C6.83527 5.035 7.10527 4.45 7.56027 4.11C7.94527 3.805 8.46527 3.655 8.96027 3.655C9.66527 3.655 10.3303 3.86 10.7503 4.355C11.0553 4.7 11.2153 5.165 11.2153 5.635C11.2153 6.275 10.9153 6.815 10.4953 7.255C10.1653 7.605 9.79027 7.83 9.60527 8.145C9.42527 8.455 9.43027 8.64 9.43027 9.045H8.32027ZM8.32527 11V9.79H9.43027V11H8.32527Z"
        fill={color}
      />
      <Path d="M4 14H14" stroke={color} />
      <Path d="M4 17H10" stroke={color} />
    </Svg>
  );
}

import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

function sendBubbleEntering() {
  'worklet';
  return {
    initialValues: {
      opacity: 0,
      transform: [{ scale: 0.85 }],
    },
    animations: {
      opacity: withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
      transform: [{ scale: withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }) }],
    },
  };
}

// Same fade+scale primitives as sendBubbleEntering, but staggered for the
// avatar → name → bubble → tip sequence on a freshly arriving incoming
// message that opens a new group.
function incomingAvatarEntering() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.85 }] },
    animations: {
      opacity: withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
      transform: [{ scale: withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }) }],
    },
  };
}
function incomingNameEntering() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.85 }] },
    animations: {
      opacity: withDelay(90, withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) })),
      transform: [
        { scale: withDelay(90, withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) })) },
      ],
    },
  };
}
function incomingBubbleEntering() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.85 }] },
    animations: {
      opacity: withDelay(180, withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) })),
      transform: [
        { scale: withDelay(180, withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) })) },
      ],
    },
  };
}
function incomingTipEntering() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.85 }] },
    animations: {
      opacity: withDelay(270, withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) })),
      transform: [
        { scale: withDelay(270, withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) })) },
      ],
    },
  };
}
// Continuation messages from the same author skip the avatar/name steps —
// just the bubble fades in immediately (matches sendBubbleEntering).
function incomingContinuationBubbleEntering() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.85 }] },
    animations: {
      opacity: withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
      transform: [{ scale: withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }) }],
    },
  };
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Svg, { Path, Rect } from 'react-native-svg';

import {
  type ChatUser,
  type MockChatMessage,
  SIM_JOIN_AFTER_MESSAGES,
  SIM_LEAVE_AFTER_MESSAGES,
} from '@/constants/mock-chat';
import {
  getChatContentForId,
  getChatUserByHandle,
  groupMemberToChatUser,
  MOCK_CHAT_CONTENT_BY_ID,
} from '@/constants/mock-chat-content';
import { MOCK_GROUP_CARDS } from '@/constants/mock-groups';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { GenderAvatar, getAvatarColors } from '@/components/ui/gender-avatar';
import { Image as ExpoImage } from 'expo-image';

import { FocusOverlay, type FocusTarget } from '@/components/chat/focus-overlay';
import { GifPickerSheet } from '@/components/chat/gif-picker-sheet';
import { ReplyPreviewChip } from '@/components/chat/reply-preview-chip';
import { ThreadSheet } from '@/components/chat/thread-sheet';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { AppHeader } from '@/components/ui/app-header';
import { HoldToConfirmButton } from '@/components/ui/hold-to-confirm-button';
import { CloseIcon } from '@/components/ui/icons/close-icon';
import { FriendIcon } from '@/components/ui/icons/friend-icon';
import { GifIcon } from '@/components/ui/icons/gif-icon';
import { ProfileIcon } from '@/components/ui/icons/profile-icon';
import { ReplyIcon } from '@/components/ui/icons/reply-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Toast } from '@/components/ui/toast';
import type { MockGif } from '@/constants/mock-gifs';
import { useActiveChat } from '@/contexts/active-chat-context';
import { useCurrentUser } from '@/contexts/current-user-context';
import { useFriends } from '@/contexts/friends-context';
import { useTabsReplaceAnim } from '@/contexts/tabs-replace-anim-context';
import { formatMsLeft } from '@/lib/active-chat-storage';
import { getChatState, setChatState } from '@/lib/chat-state-storage';
import { popPendingConnections } from '@/lib/pending-connections';
import { popPendingReplyTarget } from '@/lib/pending-reply';
import { popPendingToast, setPendingToast } from '@/lib/pending-toast';
import { setProfileTransitionSource } from '@/lib/profile-transition';
import { useNotifications } from '@/hooks/use-notifications';
import { useTheme } from '@/hooks/use-theme';

const AVATAR_SIZE = 32;
const AVATAR_OVERLAP = 12;
// Vertical shift applied to the avatars + member pill cluster so it sits low
// in the AppHeader and the pill straddles the header's bottom edge.
const CENTER_DROP = 20;

// ─── Group header center ──────────────────────────────────────────────────────

function GroupHeaderCenter({
  onPress,
  timeLeftLabel,
  members,
}: {
  onPress: () => void;
  timeLeftLabel: string | null;
  members: ChatUser[];
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    // translateY combined with scale so the press animation doesn't undo the
    // centerWrap's drop. Order matters here — translateY first, then scale,
    // so scaling happens around the dropped position.
    transform: [{ translateY: CENTER_DROP }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 14, stiffness: 400 });
        opacity.value = withTiming(0.72, { duration: 80 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 400 });
        opacity.value = withTiming(1, { duration: 140 });
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        timeLeftLabel ? `View group members. ${timeLeftLabel}` : 'View group members'
      }
      style={{ alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={[hStyles.centerWrap, animStyle]}>
        <View style={hStyles.avatarStack}>
          {members.slice(0, 3).map((m, i) => {
            const { bg, symbol } = getAvatarColors(m.id);
            return (
              <View
                key={m.id}
                style={[
                  hStyles.stackAvatarWrap,
                  {
                    marginLeft: i === 0 ? 0 : -AVATAR_OVERLAP,
                    zIndex: 10 - i,
                    borderColor: colors.backgroundPrimary,
                  },
                ]}
              >
                <GenderAvatar symbol={m.avatarSymbol} size={AVATAR_SIZE} bgColor={bg} symbolColor={symbol} />
              </View>
            );
          })}
        </View>
        <View
          style={[
            hStyles.memberPill,
            { backgroundColor: colors.backgroundPrimary, borderColor: colors.gray80 },
          ]}
        >
          <Text style={[hStyles.memberPillText, { color: colors.textPrimary }]}>
            {members.length} members
          </Text>
          {timeLeftLabel ? (
            <>
              <View style={[hStyles.memberPillDot, { backgroundColor: colors.textSecondary }]} />
              <Text style={[hStyles.memberPillText, { color: colors.textPrimary }]}>
                {timeLeftLabel}
              </Text>
            </>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const hStyles = StyleSheet.create({
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    // The vertical drop is applied via the Animated.View's transform (see
    // animStyle above) so it composes with the press-scale animation. zIndex
    // keeps the cluster above the chat list when it dips below the header.
    zIndex: 10,
    elevation: 10,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackAvatarWrap: {
    borderWidth: 2,
    borderColor: Colors.white,
    // Wrap auto-sizes to AVATAR_SIZE + 2*borderWidth; AVATAR_SIZE/2 leaves
    // straight edges between the rounded corners. Radius.full guarantees a
    // perfect circle that hugs the avatar regardless of border thickness.
    borderRadius: Radius.full,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray80,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  memberPillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.black,
  },
  memberPillDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray80,
  },
});

// ─── Group sheet ──────────────────────────────────────────────────────────────

const SHEET_OPEN  = { duration: 280, easing: Easing.out(Easing.cubic) } as const;
const SHEET_CLOSE = { duration: 260, easing: Easing.in(Easing.cubic)  } as const;
const SHEET_SNAP  = { duration: 200, easing: Easing.out(Easing.quad)  } as const;

function GroupSheet({
  onClose,
  onLeaveConfirmed,
  members,
}: {
  onClose: () => void;
  onLeaveConfirmed: () => void;
  members: ChatUser[];
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const translateY = useSharedValue(600);
  const overlayOpacity = useSharedValue(0);
  const onCloseRef = useRef(onClose);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const memberAvatarRefs = useRef<Map<string, View | null>>(new Map());
  const { msLeft } = useActiveChat();
  const { currentUserId, friendships, outgoingRequests, sendFriendRequest } = useFriends();
  const friendIds = useMemo(() => {
    const ids = new Set<string>();
    for (const f of friendships) {
      if (f.userAId === currentUserId) ids.add(f.userBId);
      else if (f.userBId === currentUserId) ids.add(f.userAId);
    }
    return ids;
  }, [friendships, currentUserId]);
  const pendingSentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of outgoingRequests) {
      if (r.senderId === currentUserId) ids.add(r.recipientId);
    }
    return ids;
  }, [outgoingRequests, currentUserId]);

  const handleAddFriend = useCallback(
    async (targetId: string, handle: string) => {
      const result = await sendFriendRequest(targetId);
      if (!result.ok) {
        if (result.reason === 'no-shared-chat') {
          Alert.alert(
            'Not in a shared chat',
            "You can only add friends from chats you've both been in.",
          );
        } else if (result.reason === 'already-friends') {
          Alert.alert('Already friends', `You and @${handle} are already friends.`);
        }
      }
    },
    [sendFriendRequest],
  );
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    translateY.value = withTiming(0, SHEET_OPEN);
    overlayOpacity.value = withTiming(1, { duration: 220 });
  }, []);

  const handleClose = useCallback(() => {
    const closeCb = onCloseRef.current;
    translateY.value = withTiming(700, SHEET_CLOSE, (done) => {
      'worklet';
      if (done) runOnJS(closeCb)();
    });
    overlayOpacity.value = withTiming(0, { duration: 220 });
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.value = g.dy; },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) handleClose();
        else translateY.value = withTiming(0, SHEET_SNAP);
      },
    }),
  ).current;

  const overlayAnimStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const sheetAnimStyle  = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <Modal transparent visible onRequestClose={handleClose}>
      <Animated.View style={[StyleSheet.absoluteFill, sStyles.dim, overlayAnimStyle]} pointerEvents="none" />
      <View style={sStyles.modalRoot}>
        <Pressable style={sStyles.dismissArea} onPress={handleClose} />
        <Animated.View style={[sStyles.sheet, sheetAnimStyle, { backgroundColor: colors.backgroundPrimary, paddingBottom: Math.max(insets.bottom + Spacing.md, 54) }]} {...panResponder.panHandlers}>

          {/* Close button — cancels the confirm step or closes the sheet */}
          <PressableScale
            style={[sStyles.closeBtn, { backgroundColor: colors.buttonPrimary }]}
            onPress={showLeaveConfirm ? () => setShowLeaveConfirm(false) : handleClose}
            accessibilityRole="button"
            accessibilityLabel={showLeaveConfirm ? 'Cancel leave' : 'Close'}
          >
            <CloseIcon size={24} color={colors.textPrimaryInverted} />
          </PressableScale>

          {showLeaveConfirm ? (
            <View style={sStyles.leaveConfirmContent}>
              <Text style={[sStyles.leaveConfirmTitle, { color: colors.textPrimary }]}>Leave the chat?</Text>
              <Text style={[sStyles.leaveConfirmMessage, { color: colors.textSecondary }]}>
                You won't be able to rejoin. You can only leave 1 chat per day.
              </Text>
              <HoldToConfirmButton
                label="Leave the chat"
                holdingLabel="Hold to leave..."
                onConfirm={onLeaveConfirmed}
                style={[sStyles.holdBtn, { backgroundColor: colors.backgroundPrimary }]}
                labelStyle={sStyles.holdBtnLabel}
                fillColor={Colors.cherry}
                spinnerColor={Colors.cherry}
                activeLabelColor={Colors.white}
                activeSpinnerColor={Colors.white}
              />
            </View>
          ) : (
            <>
              {/* Header row */}
              <View style={sStyles.sheetHeader}>
                <Text style={[sStyles.sheetTitle, { color: colors.textPrimary }]}>Members</Text>
                <Text style={[sStyles.sheetDaysLeft, { color: colors.textSecondary }]}>{formatMsLeft(msLeft)}</Text>
              </View>

              {/* Member list */}
              <View style={sStyles.memberList}>
                {[...members]
                  .sort((a, b) => {
                    if (a.id === currentUserId) return 1;
                    if (b.id === currentUserId) return -1;
                    return 0;
                  })
                  .map((m) => {
                  const isMe = m.id === currentUserId;
                  const isFriend = !isMe && friendIds.has(m.id);
                  const isPendingSent = !isMe && !isFriend && pendingSentIds.has(m.id);
                  // Seed by handle so the avatar matches the profile hero.
                  const { bg, symbol } = getAvatarColors(m.handle);
                  const openProfile = () => {
                    const node = memberAvatarRefs.current.get(m.id);
                    const go = () => {
                      handleClose();
                      if (isMe) router.push('/profile');
                      else
                        router.push({
                          pathname: '/user/[username]',
                          params: { username: m.handle },
                        });
                    };
                    if (!node) {
                      go();
                      return;
                    }
                    node.measureInWindow((x, y, w, h) => {
                      setProfileTransitionSource({
                        rect: { x, y, width: w, height: h },
                        username: m.handle,
                        seed: m.handle,
                        avatarSymbol: m.avatarSymbol,
                        bg,
                        symbol,
                        // The sheet animates away as we navigate, so the source
                        // rect is invalid by the time we morph back.
                        transient: true,
                      });
                      go();
                    });
                  };
                  return (
                    <Pressable
                      key={m.id}
                      style={({ pressed }) => [
                        sStyles.memberRow,
                        { borderColor: colors.gray100 },
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={openProfile}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isMe ? 'Open your profile' : `Open profile for @${m.handle}`
                      }
                    >
                      <View style={sStyles.memberRowLeft}>
                        <View
                          ref={(node) => {
                            memberAvatarRefs.current.set(m.id, node);
                          }}
                          collapsable={false}
                        >
                          <GenderAvatar symbol={m.avatarSymbol} size={32} bgColor={bg} symbolColor={symbol} />
                        </View>
                        <Text style={[sStyles.memberHandle, { color: colors.textPrimary }]}>@{m.handle}</Text>
                        {m.pronouns ? <Text style={[sStyles.memberPronouns, { color: colors.textSecondary }]}>({m.pronouns})</Text> : null}
                      </View>
                      {isMe ? (
                        <View style={[sStyles.youBadge, { backgroundColor: colors.gray100 }]}>
                          <Text style={[sStyles.youBadgeText, { color: colors.chatBlue }]}>You :)</Text>
                        </View>
                      ) : isFriend ? (
                        <FriendIcon size={28} />
                      ) : isPendingSent ? (
                        <View style={sStyles.addFriendRow}>
                          <Text style={[sStyles.addFriendText, { color: colors.textSecondary }]}>Requested</Text>
                          <Ionicons name="checkmark" size={16} color={colors.textSecondary} />
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => void handleAddFriend(m.id, m.handle)}
                          hitSlop={8}
                          style={({ pressed }) => [sStyles.addFriendRow, pressed && { opacity: 0.6 }]}
                          accessibilityRole="button"
                          accessibilityLabel={`Send friend request to @${m.handle}`}
                        >
                          <Text style={[sStyles.addFriendText, { color: colors.textPrimary }]}>Add Friend</Text>
                          <AddFriendIcon />
                        </Pressable>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Divider */}
              <View style={[sStyles.divider, { backgroundColor: colors.gray100 }]} />

              {/* Leave button */}
              <View style={sStyles.leaveSection}>
                <PrimaryNextButton
                  label="Leave the chat"
                  onPress={() => setShowLeaveConfirm(true)}
                />
                <Text style={[sStyles.leaveHelper, { color: colors.gray60 }]}>You can only leave 1 chat per day</Text>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Chat ended overlay ──────────────────────────────────────────────────────
// Shown once when the 7-day timer expires while the user is in the chat.
// The persisted active-chat state has already been cleared by the context;
// this overlay is purely UX. Dismissing routes the user to chat-selection.

function ChatEndedOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <View style={endedStyles.dim}>
        <View style={endedStyles.card}>
          <Text style={endedStyles.title}>This chat has ended</Text>
          <Text style={endedStyles.body}>
            Your 7 days are up. The chat is closed, but the people you connected with are saved.
          </Text>
          <TouchableOpacity style={endedStyles.button} onPress={onDismiss} accessibilityRole="button">
            <Text style={endedStyles.buttonText}>Back to chats</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const endedStyles = StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.black,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.black,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.black,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    color: Colors.white,
  },
});

// ─── Likes sheet ──────────────────────────────────────────────────────────────

function LikesSheet({ likerIds, onClose }: { likerIds: string[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { me } = useCurrentUser();
  const translateY = useSharedValue(600);
  const overlayOpacity = useSharedValue(0);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    translateY.value = withTiming(0, SHEET_OPEN);
    overlayOpacity.value = withTiming(1, { duration: 220 });
  }, []);

  const handleClose = useCallback(() => {
    const closeCb = onCloseRef.current;
    translateY.value = withTiming(700, SHEET_CLOSE, (done) => {
      'worklet';
      if (done) runOnJS(closeCb)();
    });
    overlayOpacity.value = withTiming(0, { duration: 220 });
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.value = g.dy; },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) handleClose();
        else translateY.value = withTiming(0, SHEET_SNAP);
      },
    }),
  ).current;

  const overlayAnimStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const sheetAnimStyle  = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const likers = useMemo(
    () =>
      likerIds
        .map((id) =>
          id === 'me' && me
            ? { id: 'me' as const, handle: 'you', pronouns: '', avatarSymbol: me.avatarSymbol, isMe: true }
            : memberById(id),
        )
        .filter((m): m is NonNullable<typeof m> => Boolean(m)),
    [likerIds, me?.avatarSymbol, me],
  );

  // Sign-out flips me to null between renders. All hooks above must run
  // unconditionally on every render — gate JSX here, not earlier.
  if (!me) return null;

  return (
    <Modal transparent visible onRequestClose={handleClose}>
      <Animated.View style={[StyleSheet.absoluteFill, sStyles.dim, overlayAnimStyle]} pointerEvents="none" />
      <View style={sStyles.modalRoot}>
        <Pressable style={sStyles.dismissArea} onPress={handleClose} />
        <Animated.View style={[sStyles.sheet, sheetAnimStyle, { backgroundColor: colors.backgroundPrimary, paddingBottom: Math.max(insets.bottom + Spacing.md, 54) }]} {...panResponder.panHandlers}>
          <PressableScale style={[sStyles.closeBtn, { backgroundColor: colors.buttonPrimary }]} onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close">
            <CloseIcon size={24} color={colors.textPrimaryInverted} />
          </PressableScale>

          <View style={sStyles.sheetHeader}>
            <Text style={[sStyles.sheetTitle, { color: colors.textPrimary }]}>Liked by</Text>
            <Text style={[sStyles.sheetDaysLeft, { color: colors.textSecondary }]}>{likers.length}</Text>
          </View>

          <View style={sStyles.memberList}>
            {likers.map((m) => {
              const isMe = 'isMe' in m && m.isMe;
              const { bg, symbol } = getAvatarColors(m.id);
              return (
                <View key={m.id} style={[sStyles.memberRow, { borderColor: colors.gray100 }]}>
                  <View style={sStyles.memberRowLeft}>
                    <GenderAvatar symbol={m.avatarSymbol} size={32} bgColor={bg} symbolColor={symbol} />
                    <Text style={[sStyles.memberHandle, { color: colors.textPrimary }]}>@{isMe ? 'you' : m.handle}</Text>
                    {!isMe && m.pronouns ? <Text style={[sStyles.memberPronouns, { color: colors.textSecondary }]}>({m.pronouns})</Text> : null}
                  </View>
                  <LikeBadge size={24} />
                </View>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const sStyles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(0,0,0,0.70)' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 16,
  },
  // Close button (matches auth sheet style)
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  // Header row: "Members" + "7d left"
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sheetTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.black, letterSpacing: -0.32 },
  sheetDaysLeft: { fontFamily: FontFamily.extraBold, fontSize: 12, color: Colors.gray40, letterSpacing: -0.24 },
  // Member list
  memberList: { gap: Spacing.sm, marginBottom: Spacing.md },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: Colors.gray100,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
  },
  memberRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  memberHandle: { fontFamily: FontFamily.bold, fontSize: 16, lineHeight: 20, color: Colors.black, letterSpacing: -0.32 },
  memberPronouns: { fontFamily: FontFamily.medium, fontSize: 16, lineHeight: 20, color: Colors.black },
  // "Add Friend" action
  addFriendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addFriendText: { fontFamily: FontFamily.extraBold, fontSize: 12, color: Colors.black, letterSpacing: -0.24 },
  // "You :)" badge
  youBadge: {
    backgroundColor: Colors.gray100,
    borderRadius: Radius.xs,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  youBadgeText: { fontFamily: FontFamily.extraBold, fontSize: 12, color: Colors.blue, letterSpacing: -0.24 },
  // Divider
  divider: { height: 1, backgroundColor: Colors.gray100, marginBottom: Spacing.md },
  // Leave section
  leaveSection: { gap: Spacing.sm },
  leaveHelper: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.gray60,
    textAlign: 'center',
  },
  // Leave confirmation (Figma 449:8394)
  leaveConfirmContent: {
    alignItems: 'stretch',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  leaveConfirmTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    lineHeight: 24,
    letterSpacing: -0.8,
    color: Colors.black,
    textAlign: 'center',
  },
  leaveConfirmMessage: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: 22,
    color: Colors.gray40,
    textAlign: 'center',
  },
  // Hold-to-confirm leave button (cherry outline; fills with cherry as held)
  holdBtn: {
    height: 48,
    width: '100%',
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.cherry,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  holdBtnLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.32,
    color: Colors.cherry,
  },
});

// ─── Chat screen ──────────────────────────────────────────────────────────────

function buildInitialRows(): MockChatMessage[] {
  const connections = popPendingConnections();
  return connections.map((c) => ({
    id: `connection-${c.handle}`,
    authorId: 'system',
    body: `You connected with @${c.handle} ♥`,
    type: 'system-connection',
    connection: c,
  }));
}

function formatEventAgo(eventAt: number, verb: 'joined' | 'left'): string {
  const ms = Math.max(0, Date.now() - eventAt);
  const minutes = Math.floor(ms / (60 * 1000));
  if (minutes < 1) return verb === 'joined' ? 'just joined' : 'just left';
  if (minutes < 60) return `${verb} ${minutes}min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${verb} ${hours}hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return verb === 'joined' ? 'joined yesterday' : 'left yesterday';
  return `${verb} ${days}d ago`;
}

function memberById(id: string, me?: ChatUser) {
  if (id === 'me') return me;
  // Universal handle lookup — scans every card's members plus legacy roster.
  return getChatUserByHandle(id);
}

function BubbleAvatar({ member }: { member: ChatUser }) {
  const router = useRouter();
  const ref = useRef<View>(null);
  // Seed by handle so the avatar matches the profile hero.
  const { bg, symbol } = getAvatarColors(member.handle);

  const onPress = () => {
    const node = ref.current;
    if (!node) {
      router.push({ pathname: '/user/[username]', params: { username: member.handle } });
      return;
    }
    node.measureInWindow((x, y, w, h) => {
      setProfileTransitionSource({
        rect: { x, y, width: w, height: h },
        username: member.handle,
        seed: member.handle,
        avatarSymbol: member.avatarSymbol,
        bg,
        symbol,
      });
      router.push({ pathname: '/user/[username]', params: { username: member.handle } });
    });
  };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`Open @${member.handle}'s profile`}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <View ref={ref} collapsable={false}>
        <GenderAvatar symbol={member.avatarSymbol} size={32} bgColor={bg} symbolColor={symbol} />
      </View>
    </Pressable>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const listRef = useRef<FlatList<MockChatMessage>>(null);
  const { leaveChat, justExpired, acknowledgeExpiry, joinedAt, activeChatId, msLeft } =
    useActiveChat();
  // Profile badge counts unique senders with unread activity (matches the
  // My Friends badge on /profile and the home tab profile badge). The raw
  // total double-counts a single friend who shared gallery + prompts + identity.
  const { friendsWithUnreadCount: unreadCount } = useNotifications();
  const { currentUserId, bannedIds } = useFriends();
  const { me } = useCurrentUser();
  const { setAnim: setTabsReplaceAnim } = useTabsReplaceAnim();

  // Flip the (tabs) replace animation to 'pop' as soon as chat mounts so any
  // subsequent leave / expiry navigation reads the correct option. Setting it
  // right before `router.replace` doesn't work — React batches state updates
  // and the navigator reads the still-'push' option before the re-render
  // commits, so chat-selection slides in from the right.
  //
  // Reset to 'push' in the cleanup, NOT in chat-selection's focus effect: the
  // focus effect fires synchronously when chat-selection becomes focused,
  // which happens at the START of the leave transition. That re-flips the
  // (tabs) screen's animationTypeForReplace mid-animation and react-navigation
  // re-reads it, defeating the 'pop'. The cleanup runs only after chat fully
  // unmounts (post-transition), so the in-progress animation is unaffected.
  useEffect(() => {
    setTabsReplaceAnim('pop');
    return () => {
      setTabsReplaceAnim('push');
    };
  }, [setTabsReplaceAnim]);

  // Per-card content: members + welcome drip + sim handles all come from the
  // active card so each chat feels like its own conversation. Falls back to
  // the first card when activeChatId hasn't hydrated yet — the screen will
  // bounce to chat-selection in that case, but the lookups still need to
  // resolve without throwing during the brief render window.
  const activeCard = useMemo(
    () => MOCK_GROUP_CARDS.find((g) => g.id === activeChatId) ?? MOCK_GROUP_CARDS[0],
    [activeChatId],
  );
  const activeChatContent = useMemo(
    () => getChatContentForId(activeCard.id) ?? MOCK_CHAT_CONTENT_BY_ID[MOCK_GROUP_CARDS[0].id],
    [activeCard.id],
  );
  const cardChatMembers = useMemo(
    () => activeCard.members.map(groupMemberToChatUser),
    [activeCard],
  );
  const simLeaveHandle = activeChatContent.simLeaveHandle;
  const simJoinHandle = activeChatContent.simJoinHandle;
  // Refs keep the drip effect's setTimeout chain reading current values even
  // though the effect itself only runs once on mount.
  const welcomeDripRef = useRef(activeChatContent.welcomeDrip);
  welcomeDripRef.current = activeChatContent.welcomeDrip;

  const [draft, setDraft] = useState('');
  const [sheetVisible, setSheetVisible] = useState(false);
  // Start empty so we don't drain `popPendingConnections` here only to have
  // the session-init useEffect below call `buildInitialRows()` again and
  // overwrite the freshly drained rows with `[]`. The useEffect is the
  // single owner of pending-connection drainage at mount time.
  const [rows, setRows] = useState<MockChatMessage[]>(() => []);
  const [likesByMessage, setLikesByMessage] = useState<Record<string, string[]>>(() => ({}));
  const [likesSheetFor, setLikesSheetFor] = useState<string | null>(null);
  const lastTapRef = useRef<{ id: string | null; time: number }>({ id: null, time: 0 });
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const [freshIncomingIds, setFreshIncomingIds] = useState<Set<string>>(() => new Set());
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [stagedGif, setStagedGif] = useState<MockGif | null>(null);
  const [focusedMessage, setFocusedMessage] = useState<FocusTarget | null>(null);
  const [replyingTo, setReplyingTo] = useState<MockChatMessage | null>(null);
  const [threadOpenFor, setThreadOpenFor] = useState<string | null>(null);
  const [reportToast, setReportToast] = useState<string | null>(null);
  // Magenta dot on the prompt-answers header button — flips on when a new
  // member's join is announced, clears when the user opens /answers.
  const [hasUnreadAnswer, setHasUnreadAnswer] = useState(false);
  // Live membership of the chat. The simulated leave/join effect mutates this
  // alongside appending the corresponding system rows. The card's
  // `simJoinHandle` (typically `sage_glow`) is excluded initially and only
  // joins when the simulated join event fires.
  // Seed with the active card's members + the live "me" user. Changes to
  // the live `me` flow in via a separate effect so the chat reflects edits
  // from settings/onboarding without remounting.
  const [presentMembers, setPresentMembers] = useState<ChatUser[]>(() => {
    const base = cardChatMembers.filter((m) => m.handle !== simJoinHandle);
    return me ? [...base, me] : base;
  });

  // Hydration gate: chat-state-storage holds the rows / likes / roster /
  // used-drip-ids from the previous session so a reload doesn't replay the
  // welcome drip and sim events from scratch. We block the drip + sim effects
  // until hydration completes, otherwise they'd push duplicate messages on top
  // of restored rows.
  const [hydrated, setHydrated] = useState(false);
  // Tracks which chat session the current React state (rows/likes/etc.)
  // belongs to. Keyed by `${chatId}-${joinedAt}` so rejoining the SAME chat
  // (new joinedAt) also resets state — otherwise the prior session's sim-join
  // row would linger and the new sim-join (different id derived from the new
  // joinedAt) would append, producing two "Welcome @X" rows.
  const hydratedSessionKeyRef = useRef<string | null>(null);
  const usedDripIdsRef = useRef<Set<string>>(new Set());
  // Flips to true after the first jump-to-end so the auto-scroll-on-content
  // change handler knows whether to animate (subsequent appends) or skip
  // (the first onContentSizeChange fires before hydration completes).
  const didInitialScrollRef = useRef(false);
  // Chat is hidden (opacity 0) until we've successfully snapped to the bottom
  // — without this the FlatList briefly paints at the top during the initial
  // mount + scroll, which reads as "opens at the top."
  const [chatReady, setChatReady] = useState(false);
  useEffect(() => {
    if (!activeChatId || !joinedAt) return;
    const sessionKey = `${activeChatId}-${joinedAt}`;
    // If we're switching to a different chat OR rejoining the same chat with
    // a new joinedAt, wipe local state so we don't briefly show the prior
    // session's rows and so the persistence effect can't snapshot stale rows
    // under the new session.
    if (hydratedSessionKeyRef.current !== sessionKey) {
      setHydrated(false);
      setRows(buildInitialRows());
      setLikesByMessage({});
      setHasUnreadAnswer(false);
      usedDripIdsRef.current = new Set();
    }
    let cancelled = false;
    (async () => {
      const stored = await getChatState(activeChatId);
      if (cancelled) return;
      if (stored) {
        setRows((prev) => {
          // Preserve any rows that arrived between mount and hydration (e.g.
          // connection events injected by buildInitialRows or the focus
          // effect) by appending them after the restored history.
          const storedIds = new Set(stored.rows.map((r) => r.id));
          const extras = prev.filter((r) => !storedIds.has(r.id));
          return extras.length > 0 ? [...stored.rows, ...extras] : stored.rows;
        });
        setLikesByMessage(stored.likesByMessage);
        setPresentMembers(stored.presentMembers);
        setHasUnreadAnswer(stored.hasUnreadAnswer);
        usedDripIdsRef.current = new Set(stored.usedDripIds);
      }
      hydratedSessionKeyRef.current = sessionKey;
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeChatId, joinedAt]);

  // Persist whenever the durable parts of chat state change. usedDripIds is a
  // ref (it doesn't trigger renders), but every drip append also appends to
  // rows, so this effect snapshots its current value alongside the row update.
  // Gated on hydratedSessionKeyRef so a session change can't write the prior
  // session's rows under the new session's storage key before re-hydration.
  useEffect(() => {
    if (!hydrated || !activeChatId || !joinedAt) return;
    if (hydratedSessionKeyRef.current !== `${activeChatId}-${joinedAt}`) return;
    void setChatState(activeChatId, {
      rows,
      likesByMessage,
      presentMembers,
      usedDripIds: Array.from(usedDripIdsRef.current),
      hasUnreadAnswer,
    });
  }, [hydrated, activeChatId, joinedAt, rows, likesByMessage, presentMembers, hasUnreadAnswer]);

  // Fresh chat (hydrated, no rows): nothing to scroll past, so reveal
  // immediately instead of waiting on the fallback timer. The fade animation
  // made the otherwise-hidden welcome header visibly lag.
  useEffect(() => {
    if (!hydrated || chatReady) return;
    if (rows.length === 0) {
      didInitialScrollRef.current = true;
      setChatReady(true);
    }
  }, [hydrated, chatReady, rows.length]);

  // Safety-net fallback: if onContentSizeChange hasn't fired within 100ms
  // after hydration, show the chat anyway so it doesn't stay hidden forever.
  // Was 400ms; that delay was perceptible with the chat-screen fade revealing
  // an empty container ahead of the content.
  useEffect(() => {
    if (!hydrated || chatReady) return;
    const t = setTimeout(() => {
      didInitialScrollRef.current = true;
      setChatReady(true);
    }, 100);
    return () => clearTimeout(t);
  }, [hydrated, chatReady]);


  // Reset the roster when the active chat changes (e.g. rejoining a different
  // card after expiry). Keeps presentMembers in sync with the active card's
  // members + the live `me`.
  useEffect(() => {
    const base = cardChatMembers.filter((m) => m.handle !== simJoinHandle);
    setPresentMembers(me ? [...base, me] : base);
    // The `me` sync effect below keeps the `me` entry fresh on subsequent
    // profile edits; intentionally not depending on `me` here so per-card
    // resets don't run on every profile change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCard.id, simJoinHandle]);

  // Keep the "me" entry in presentMembers in sync with the current user
  // profile (handle/pronouns/avatar updates from settings or fresh onboarding).
  useEffect(() => {
    if (!me) return;
    setPresentMembers((prev) => {
      const idx = prev.findIndex((m) => m.id === 'me');
      if (idx < 0) return [...prev, me];
      const next = prev.slice();
      next[idx] = me;
      return next;
    });
  }, [me]);
  const messageRefs = useRef<Record<string, View | null>>({});
  const inputRef = useRef<TextInput>(null);

  // Banned authors' messages are scrubbed in-place so the bubble keeps its
  // place in the thread (preserving reply targets and indices) but content,
  // GIFs, and connection cards are wiped. The original row IDs are preserved.
  const displayRows = useMemo<MockChatMessage[]>(() => {
    if (bannedIds.size === 0) return rows;
    return rows.map((r) => {
      if (!bannedIds.has(r.authorId)) return r;
      return {
        id: r.id,
        authorId: r.authorId,
        body: '[Removed]',
        replyToId: r.replyToId,
      };
    });
  }, [rows, bannedIds]);

  const rowsById = useMemo(() => {
    const map: Record<string, MockChatMessage> = {};
    for (const r of displayRows) map[r.id] = r;
    return map;
  }, [displayRows]);

  const repliesByParent = useMemo(() => {
    const map: Record<string, MockChatMessage[]> = {};
    for (const r of displayRows) {
      if (r.replyToId) {
        if (!map[r.replyToId]) map[r.replyToId] = [];
        map[r.replyToId].push(r);
      }
    }
    return map;
  }, [displayRows]);

  const resolveRoot = useCallback(
    (msg: MockChatMessage): MockChatMessage => {
      let cur = msg;
      for (let depth = 0; depth < 8; depth++) {
        if (!cur.replyToId) return cur;
        const parent = rowsById[cur.replyToId];
        if (!parent) return cur;
        cur = parent;
      }
      return cur;
    },
    [rowsById],
  );

  const lastOtherIndex = useMemo(() => {
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      if (r.authorId !== 'me' && r.type !== 'system-connection') return i;
    }
    return -1;
  }, [rows]);

  const hasLikedAny = useMemo(
    () => Object.values(likesByMessage).some((ids) => ids.includes('me')),
    [likesByMessage],
  );

  const dripTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [typingMember, setTypingMember] = useState<ChatUser | null>(null);

  // Mock simulation: a member leaves and another joins once a few "real"
  // messages have flowed through the chat. Counted against drip + user
  // rows (excluding system-* events) so the events feel like a reaction
  // to chatter rather than firing the instant /chat mounts. Anchoring to
  // message count instead of wall-clock time avoids the catch-up case
  // where a user lingers elsewhere, the canonical delay elapses, and
  // both events fire back-to-back on first chat mount.
  //
  // The setRows callbacks dedupe by id, so this effect re-running on
  // every rows change (including the row it appended) is a no-op once
  // each event has fired. setPresentMembers updates are idempotent.
  useEffect(() => {
    if (!hydrated || !joinedAt) return;
    const leaveId = `sim-leave-${joinedAt}`;
    const joinId = `sim-join-${joinedAt}`;
    const realMessageCount = rows.filter((r) => !r.type).length;
    // Dedup by row TYPE rather than id. A chat session only ever surfaces one
    // sim-leave and one sim-join; matching by id alone broke when in-memory
    // joinedAt drifted from the persisted value (the row was saved with one
    // timestamp and looked up with another on reload, producing duplicates).
    const hasSimLeave = rows.some((r) => r.type === 'system-leave');
    const hasSimJoin = rows.some((r) => r.type === 'system-join');

    if (realMessageCount >= SIM_LEAVE_AFTER_MESSAGES && !hasSimLeave) {
      setRows((prev) => {
        if (prev.some((r) => r.type === 'system-leave')) return prev;
        return [
          ...prev,
          {
            id: leaveId,
            authorId: 'system',
            body: `@${simLeaveHandle} left the chat`,
            type: 'system-leave',
            memberHandle: simLeaveHandle,
            eventAt: Date.now(),
          },
        ];
      });
      setPresentMembers((prev) => prev.filter((m) => m.handle !== simLeaveHandle));
    }

    if (realMessageCount >= SIM_JOIN_AFTER_MESSAGES && !hasSimJoin) {
      setRows((prev) => {
        if (prev.some((r) => r.type === 'system-join')) return prev;
        return [
          ...prev,
          {
            id: joinId,
            authorId: 'system',
            body: `Welcome @${simJoinHandle} to the chat!`,
            type: 'system-join',
            memberHandle: simJoinHandle,
            eventAt: Date.now(),
          },
        ];
      });
      // The outer `!rows.some(...)` gate guarantees we only get here on the
      // first fire; setRows's internal dedupe still protects against
      // StrictMode double-invocations. Don't rely on a side effect inside
      // the updater function — React may call updaters more than once or
      // defer them, which left the unread flag unset for sage's arrival.
      setHasUnreadAnswer(true);
      setPresentMembers((prev) => {
        if (prev.some((m) => m.handle === simJoinHandle)) return prev;
        const joiner = getChatUserByHandle(simJoinHandle);
        return joiner ? [...prev, joiner] : prev;
      });
    }
  }, [hydrated, joinedAt, rows, simLeaveHandle, simJoinHandle]);

  useEffect(() => {
    if (!hydrated) return;
    const TYPING_LEAD_MS = 1200;
    function scheduleNext() {
      const delay = 5_000 + Math.random() * 5_000;
      dripTimerRef.current = setTimeout(() => {
        const remaining = welcomeDripRef.current.filter(
          (m) => !usedDripIdsRef.current.has(m.id),
        );
        if (remaining.length === 0) return;
        const pick = remaining[Math.floor(Math.random() * remaining.length)];
        usedDripIdsRef.current.add(pick.id);
        const newId = `${pick.id}-${Date.now()}`;
        const author = getChatUserByHandle(pick.authorId);
        if (author) setTypingMember(author);
        typingTimerRef.current = setTimeout(() => {
          setTypingMember(null);
          setRows((prev) => [...prev, { ...pick, id: newId }]);
          setFreshIncomingIds((prev) => {
            const next = new Set(prev);
            next.add(newId);
            return next;
          });
          scheduleNext();
        }, TYPING_LEAD_MS);
      }, delay);
    }
    scheduleNext();
    return () => {
      if (dripTimerRef.current) clearTimeout(dripTimerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      dripTimerRef.current = null;
      typingTimerRef.current = null;
    };
  }, [hydrated]);

  const onSend = useCallback(() => {
    const text = draft.trim();
    if (!text && !stagedGif) return;
    const id = `local-${Date.now()}`;
    setFreshIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setDraft('');
    const gif = stagedGif ? { url: stagedGif.url, title: stagedGif.title } : undefined;
    setStagedGif(null);
    const parent = replyingTo;
    const replyToId = parent?.id;
    setReplyingTo(null);
    setRows((prev) => {
      // Deferred share: replyingTo points at a system-connection that isn't in
      // rows yet (the user came from /answers via Reply). Insert it now so the
      // reply has a real parent and the card renders as part of the same send.
      const needsInsert =
        parent?.type === 'system-connection' &&
        !!parent.connection &&
        !prev.some((r) => r.id === parent.id);
      const next: MockChatMessage[] = [...prev];
      if (needsInsert && parent) next.push(parent);
      next.push({ id, authorId: 'me', body: text, gif, replyToId });
      return next;
    });
    // The composer may shrink (cleared text + reply chip removed) on the same
    // frame the new rows render — onContentSizeChange can fire against the
    // pre-shrink FlatList bounds, leaving the new bubble partly under the
    // composer. Re-scroll after layout settles to guarantee it lands above.
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    });
    setTimeout(() => {
      setFreshIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 500);
  }, [draft, stagedGif, replyingTo]);

  const handleLongPressMessage = useCallback(
    (id: string) => {
      const node = messageRefs.current[id];
      if (!node) return;
      node.measureInWindow((x, y, width, height) => {
        if (!width) return;
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        const message = rowsById[id];
        if (!message) return;
        setFocusedMessage({ message, rect: { x, y, width, height } });
      });
    },
    [rowsById],
  );

  const handleOverlayReply = useCallback(() => {
    if (!focusedMessage) return;
    setReplyingTo(resolveRoot(focusedMessage.message));
    setFocusedMessage(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 240);
  }, [focusedMessage, resolveRoot]);

  // Drains pending state from /answers on every focus. Two payloads:
  //   1. New Like-shared connections (`addPendingConnection` from the Like
  //      flow) — appended as system-connection rows immediately.
  //   2. A pending reply target — the answer the user tapped Reply on. The
  //      chat arms replyingTo against the answer but does NOT insert the
  //      connection card yet; that happens at send time so a user who clears
  //      the chip never leaks the card into the chat.
  useFocusEffect(
    useCallback(() => {
      const newConnections = popPendingConnections();
      const newRows: MockChatMessage[] = newConnections.map((c) => ({
        id: `connection-${c.handle}`,
        authorId: 'system',
        body: `You connected with @${c.handle} ♥`,
        type: 'system-connection',
        connection: c,
      }));
      if (newRows.length > 0) {
        let appended = false;
        setRows((prev) => {
          const existing = new Set(prev.map((r) => r.id));
          const fresh = newRows.filter((r) => !existing.has(r.id));
          if (fresh.length === 0) return prev;
          appended = true;
          return [...prev, ...fresh];
        });
        // The connection card has a fixed 246px height plus margins. If we
        // leave the scroll to `onContentSizeChange`, FlatList may fire it
        // before the new item's height is fully registered (especially right
        // after a focus transition), leaving the card's bottom tucked under
        // the composer. Scroll explicitly with a retry — same pattern as
        // `onSend` — so the card lands fully visible above the input.
        if (appended) {
          requestAnimationFrame(() => {
            listRef.current?.scrollToEnd({ animated: false });
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
          });
        }
      }

      const replyTarget = popPendingReplyTarget();
      if (replyTarget) {
        const targetId = `connection-${replyTarget.handle}`;
        // If the user previously Liked this card, it's already in rows — reuse
        // that row so the reply attaches to the existing connection. Otherwise
        // build a synthetic message that is only inserted at send time.
        const existing = rows.find((r) => r.id === targetId);
        const parent: MockChatMessage =
          existing ?? {
            id: targetId,
            authorId: 'system',
            body: `Replying to @${replyTarget.handle}`,
            type: 'system-connection',
            connection: replyTarget,
          };
        setReplyingTo(parent);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 240);
      }

      // Show toast set by /report (and any other pending toast emitter).
      const toastMsg = popPendingToast();
      if (toastMsg) setReportToast(toastMsg);
    }, [rows]),
  );

  const handleOverlayReport = useCallback(() => {
    if (!focusedMessage) return;
    const msg = focusedMessage.message;
    const author = getChatUserByHandle(msg.authorId);
    setFocusedMessage(null);
    if (!author || author.id === currentUserId) return;
    router.push({
      pathname: '/report',
      params: {
        reportedId: author.id,
        reportedHandle: author.handle,
        messageId: msg.id,
      },
    });
  }, [focusedMessage, router, currentUserId]);

  const handleThreadSendReply = useCallback(
    (text: string, gif?: { url: string; title: string }) => {
      if (!threadOpenFor) return;
      const id = `local-${Date.now()}`;
      setFreshIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setRows((prev) => [...prev, { id, authorId: 'me', body: text, gif, replyToId: threadOpenFor }]);
      setTimeout(() => {
        setFreshIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 500);
    },
    [threadOpenFor],
  );

  const scrollToMessage = useCallback(
    (id: string) => {
      const index = rows.findIndex((r) => r.id === id);
      if (index < 0) return;
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.4 });
    },
    [rows],
  );

  const handleLeaveChat = useCallback(async () => {
    setSheetVisible(false);
    await leaveChat();
    router.replace('/(tabs)/chat-selection');
  }, [leaveChat, router]);

  const handleExpiryAcknowledged = useCallback(() => {
    acknowledgeExpiry();
    router.replace('/(tabs)/chat-selection');
  }, [acknowledgeExpiry, router]);

  // Swallow Android hardware back while the chat is the user's home — only
  // Leave or 7-day expiry should exit. iOS swipe-back is handled at the
  // Stack.Screen level via `gestureEnabled: false`.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const toggleMyLike = useCallback((messageId: string) => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLikesByMessage((prev) => {
      const current = prev[messageId] ?? [];
      const next = current.includes('me')
        ? current.filter((id) => id !== 'me')
        : [...current, 'me'];
      return { ...prev, [messageId]: next };
    });
  }, []);

  const handleBubbleTap = useCallback(
    (messageId: string) => {
      const now = Date.now();
      const last = lastTapRef.current;
      if (last.id === messageId && now - last.time < 300) {
        lastTapRef.current = { id: null, time: 0 };
        toggleMyLike(messageId);
      } else {
        lastTapRef.current = { id: messageId, time: now };
      }
    },
    [toggleMyLike],
  );

  const renderItem: ListRenderItem<MockChatMessage> = useCallback(({ item, index }) => {
    // Skip replies that aren't the first to their parent — they only appear in the thread view
    if (item.replyToId) {
      const siblings = repliesByParent[item.replyToId] ?? [];
      if (siblings[0]?.id !== item.id) return null;
    }
    const replyCount = repliesByParent[item.id]?.length ?? 0;
    const showRepliesLink = replyCount >= 2;
    const quotedParent = item.replyToId ? rowsById[item.replyToId] : null;

    const setRef = (el: View | null) => {
      if (el) messageRefs.current[item.id] = el;
      else delete messageRefs.current[item.id];
    };

    // ── System connection card ──
    if (item.type === 'system-connection' && item.connection) {
      const c = item.connection;
      const { bg, symbol } = getAvatarColors(c.handle);
      return (
        <View style={styles.connectionRow}>
          <Pressable
            ref={setRef}
            onLongPress={() => handleLongPressMessage(item.id)}
            delayLongPress={350}
            accessibilityRole="button"
            accessibilityLabel="Connection card. Long press for options."
            style={[styles.connectionCard, { backgroundColor: c.promptColors.bg }]}
          >
            <View style={styles.connectionCardHeader}>
              <View style={styles.connectionAvatarRing}>
                <GenderAvatar
                  symbol={c.avatarSymbol}
                  size={24}
                  bgColor={bg}
                  symbolColor={symbol}
                />
              </View>
              <Text style={[styles.connectionHandle, { color: c.promptColors.support }]}>
                @{c.handle}{' '}
                <Text style={styles.connectionPronouns}>({c.pronouns})</Text>
              </Text>
            </View>
            <Text style={[styles.connectionQuestion, { color: c.promptColors.fg }]}>
              {c.question}
            </Text>
            <Text style={[styles.connectionAnswer, { color: c.promptColors.support }]}>
              {c.answer}
            </Text>
            {!c.viaReply ? (
              <View style={styles.connectionLikeBadge}>
                <LikeBadge size={BADGE_SIZE} />
              </View>
            ) : null}
          </Pressable>
          {showRepliesLink && (
            <RepliesLink
              count={replyCount}
              onPress={() => setThreadOpenFor(item.id)}
              align="right"
            />
          )}
        </View>
      );
    }

    // ── System join card ──
    if (item.type === 'system-join' && item.memberHandle && item.eventAt) {
      const handle = item.memberHandle;
      const eventDate = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(item.eventAt);
      return (
        <View style={styles.welcomeBlock}>
          <Text style={[styles.welcomeDate, { color: colors.textSecondary }]}>{eventDate}</Text>
          <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>Welcome @{handle} to the chat!</Text>
          <View style={styles.welcomeMeta}>
            <Text style={[styles.welcomeMetaText, { color: colors.textSecondary }]}>Check out their prompt answer</Text>
            <Text style={[styles.welcomeMetaText, { color: colors.textSecondary }]}>{formatEventAgo(item.eventAt, 'joined')}</Text>
          </View>
        </View>
      );
    }

    // ── System leave card ──
    if (item.type === 'system-leave' && item.memberHandle) {
      const handle = item.memberHandle;
      const eventDate = item.eventAt
        ? new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }).format(item.eventAt)
        : null;
      return (
        <View style={styles.welcomeBlock}>
          {eventDate && (
            <Text style={[styles.welcomeDate, { color: colors.textSecondary }]}>{eventDate}</Text>
          )}
          <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>@{handle} left the chat</Text>
        </View>
      );
    }

    // ── My messages (outgoing) ──
    if (item.authorId === 'me') {
      const likers = likesByMessage[item.id] ?? [];
      const isFresh = freshIds.has(item.id);
      const prev = displayRows[index - 1];
      const next = displayRows[index + 1];
      const isFirstInGroup = prev?.authorId !== 'me' || prev.type === 'system-connection';
      const isLastInGroup = next?.authorId !== 'me' || next.type === 'system-connection';
      const nextIsFresh = !!next && next.authorId === 'me' && freshIds.has(next.id);
      const effectivelyLastInGroup = isLastInGroup || nextIsFresh;
      const meHasLikes = likers.length > 0;
      const bubbleMeShape = isFirstInGroup ? styles.bubbleMeFirst : styles.bubbleMeContinuation;
      const hasText = item.body.trim().length > 0;
      return (
        <View style={[styles.rowMe, !effectivelyLastInGroup && !meHasLikes && styles.rowMeTight]}>
          <Animated.View
            style={styles.bubbleMeWrap}
            entering={isFresh ? sendBubbleEntering : undefined}
          >
            {quotedParent && quotedParent.type !== 'system-connection' && (
              <View style={styles.quotedWrap}>
                <ReplyPreviewChip
                  parent={quotedParent}
                  onPress={() => scrollToMessage(quotedParent.id)}
                />
              </View>
            )}
            <Pressable
              ref={setRef}
              onLongPress={() => handleLongPressMessage(item.id)}
              delayLongPress={350}
              accessibilityRole="button"
              accessibilityLabel="Your message. Long press for options."
            >
              {item.gif && (
                <ExpoImage
                  source={{ uri: item.gif.url }}
                  style={[styles.bubbleMeGif, hasText && { marginBottom: 4 }]}
                  contentFit="cover"
                  accessibilityLabel={`GIF: ${item.gif.title}`}
                />
              )}
              {hasText && (
                <View style={[styles.bubbleMe, bubbleMeShape, { backgroundColor: colors.chatBlue }]}>
                  <Text style={[styles.bubbleMeText, { color: colors.textPrimaryInverted }]}>{item.body}</Text>
                </View>
              )}
            </Pressable>
            <LikeStack likerIds={likers} onLongPress={() => setLikesSheetFor(item.id)} />
          </Animated.View>
          {showRepliesLink && (
            <RepliesLink
              count={replyCount}
              onPress={() => setThreadOpenFor(item.id)}
              align="right"
            />
          )}
        </View>
      );
    }

    // ── Others' messages (incoming) ──
    const member = memberById(item.authorId, me ?? undefined);
    const handle = member?.handle ?? item.authorId;
    const prev = displayRows[index - 1];
    const next = displayRows[index + 1];
    const isFirstInGroup = prev?.authorId !== item.authorId;
    const isLastInGroup  = next?.authorId !== item.authorId;
    const hasLikes = (likesByMessage[item.id] ?? []).length > 0;

    // Corner radii: first bubble in group has tl:16, continuations have tl:2
    const bubbleStyle = isFirstInGroup
      ? styles.bubbleThemFirst
      : styles.bubbleThemContinuation;

    const showTip = index === lastOtherIndex && !hasLikedAny;
    const isFreshIncoming = freshIncomingIds.has(item.id);
    const animateFullSequence = isFreshIncoming && isFirstInGroup;
    const bubbleEntering = isFreshIncoming
      ? (isFirstInGroup ? incomingBubbleEntering : incomingContinuationBubbleEntering)
      : undefined;

    return (
      <>
        <View style={[styles.rowThem, !isLastInGroup && !hasLikes && styles.rowThemTight]}>
          {/* Avatar — only on last bubble in group */}
          <View style={styles.avatarSlot}>
            {isLastInGroup && member && (() => {
              const avatar = <BubbleAvatar member={member} />;
              return animateFullSequence ? (
                <Animated.View entering={incomingAvatarEntering}>{avatar}</Animated.View>
              ) : (
                avatar
              );
            })()}
          </View>

          <View style={styles.themContent}>
            {/* Name chip — only on first bubble in group */}
            {isFirstInGroup && (
              <Animated.View
                style={[styles.nameChip, { backgroundColor: colors.gray100 }]}
                entering={animateFullSequence ? incomingNameEntering : undefined}
              >
                <Text style={[styles.nameChipHandle, { color: colors.chatBlue }]}>
                  @{handle}
                </Text>
                {member?.pronouns ? (
                  <Text style={[styles.nameChipPronouns, { color: colors.chatBlue }]}>
                    {' '}({member.pronouns})
                  </Text>
                ) : null}
              </Animated.View>
            )}
            {quotedParent && quotedParent.type !== 'system-connection' && (
              <View style={[styles.quotedWrap, { alignSelf: 'flex-start' }]}>
                <ReplyPreviewChip
                  parent={quotedParent}
                  onPress={() => scrollToMessage(quotedParent.id)}
                />
              </View>
            )}
            <Animated.View style={styles.bubbleThemWrap} entering={bubbleEntering}>
              <Pressable
                ref={setRef}
                onPress={() => handleBubbleTap(item.id)}
                onLongPress={() => handleLongPressMessage(item.id)}
                delayLongPress={350}
                style={[styles.bubbleThem, bubbleStyle, { backgroundColor: colors.gray100 }]}
                accessibilityRole="button"
                accessibilityLabel="Message. Double tap to like, long press for options."
              >
                <Text style={[styles.bubbleThemText, { color: colors.textPrimary }]}>{item.body}</Text>
              </Pressable>
              <LikeStack
                likerIds={likesByMessage[item.id] ?? []}
                onLongPress={() => setLikesSheetFor(item.id)}
              />
            </Animated.View>
            {showRepliesLink && (
              <RepliesLink
                count={replyCount}
                onPress={() => setThreadOpenFor(item.id)}
                align="left"
              />
            )}
          </View>
        </View>
        {showTip && (
          animateFullSequence ? (
            <Animated.View entering={incomingTipEntering}>
              <LikeTip />
            </Animated.View>
          ) : (
            <LikeTip />
          )
        )}
      </>
    );
  }, [displayRows, rowsById, repliesByParent, likesByMessage, handleBubbleTap, handleLongPressMessage, scrollToMessage, lastOtherIndex, hasLikedAny, freshIds, freshIncomingIds, me]);

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(joinedAt ?? Date.now()),
    [joinedAt],
  );

  // Banned users disappear from the members sheet, header avatar stack, and
  // "with" line — same treatment as if they'd never been in the chat.
  const visibleMembers = useMemo(
    () => presentMembers.filter((m) => !bannedIds.has(m.id)),
    [presentMembers, bannedIds],
  );

  const withLabel = useMemo(() => {
    if (!me) return '';
    // "With …" lists the *other* people in the chat — the reader already
    // knows they joined. Excluding `me` keeps the count honest.
    const others = visibleMembers.filter((m) => m.id !== me.id);
    const handles = others.slice(0, 3).map((m) => `@${m.handle}`).join(', ');
    const more = others.length > 3 ? ` +${others.length - 3} more` : '';
    return `${handles}${more}`;
  }, [visibleMembers, me?.id, me]);

  const ListHeader = useCallback(
    () => (
      <View style={styles.welcomeBlock}>
        <Text style={[styles.welcomeDate, { color: colors.textSecondary }]}>{dateLabel}</Text>
        <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>Welcome to the chat!</Text>
        <View style={styles.welcomeMeta}>
          <Text style={[styles.welcomeMetaText, { color: colors.textSecondary }]}>With {withLabel}</Text>
          <Text style={[styles.welcomeMetaText, { color: colors.textSecondary }]}>last message sent 2hr ago</Text>
        </View>
      </View>
    ),
    [dateLabel, withLabel, colors.textPrimary, colors.textSecondary],
  );

  // Sign-out flips me to null between renders. All hooks above must run
  // unconditionally on every render — gate JSX here, not earlier.
  if (!me) return null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {justExpired && <ChatEndedOverlay onDismiss={handleExpiryAcknowledged} />}
      {sheetVisible && (
        <GroupSheet
          onClose={() => setSheetVisible(false)}
          onLeaveConfirmed={handleLeaveChat}
          members={visibleMembers}
        />
      )}
      {likesSheetFor && (
        <LikesSheet
          likerIds={likesByMessage[likesSheetFor] ?? []}
          onClose={() => setLikesSheetFor(null)}
        />
      )}
      {gifPickerOpen && (
        <GifPickerSheet
          onSelect={(gif) => {
            setStagedGif(gif);
            setGifPickerOpen(false);
          }}
          onClose={() => setGifPickerOpen(false)}
        />
      )}
      <FocusOverlay
        focus={focusedMessage}
        onReply={handleOverlayReply}
        onReport={handleOverlayReport}
        onClose={() => setFocusedMessage(null)}
      />
      <ThreadSheet
        parent={threadOpenFor ? rowsById[threadOpenFor] ?? null : null}
        replies={threadOpenFor ? repliesByParent[threadOpenFor] ?? [] : []}
        onClose={() => setThreadOpenFor(null)}
        onSendReply={handleThreadSendReply}
        onGoToMessage={scrollToMessage}
      />
      <Toast message={reportToast} onDismiss={() => setReportToast(null)} />

      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.backgroundPrimary }]}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <AppHeader
          left={{
            kind: 'icon',
            icon: <PromptIcon color={colors.textPrimaryInverted} />,
            onPress: () => {
              setHasUnreadAnswer(false);
              router.push({
                pathname: '/answers',
                params: activeChatId ? { groupId: activeChatId } : {},
              });
            },
            accessibilityLabel: hasUnreadAnswer
              ? 'View answers, new answer available'
              : 'View answers',
            dot: hasUnreadAnswer,
          }}
          center={{
            kind: 'node',
            node: (
              <GroupHeaderCenter
                onPress={() => setSheetVisible(true)}
                timeLeftLabel={joinedAt != null ? formatMsLeft(msLeft) : null}
                members={visibleMembers}
              />
            ),
          }}
          right={{
            kind: 'icon',
            icon: <ProfileIcon size={24} color={colors.textPrimaryInverted} />,
            onPress: () => router.push('/profile'),
            accessibilityLabel:
              unreadCount > 0
                ? `View profile. ${unreadCount} new notification${unreadCount === 1 ? '' : 's'}`
                : 'View profile',
            badge: unreadCount,
          }}
        />
        <View
          style={[
            styles.inner,
            { backgroundColor: colors.backgroundPrimary, opacity: chatReady ? 1 : 0 },
          ]}
        >
          <FlatList
            ref={listRef}
            style={[styles.flex, { backgroundColor: colors.backgroundPrimary }]}
            data={displayRows}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            ListFooterComponent={typingMember ? <TypingIndicator member={typingMember} /> : null}
            contentContainerStyle={[styles.listContent, { paddingBottom: Spacing.lg }]}
            onContentSizeChange={() => {
              // Ignore the empty-content fire that happens before hydration
              // lands — without this the flag would flip on an empty list and
              // the later hydrated batch would animate from the top.
              if (displayRows.length === 0) return;
              if (!didInitialScrollRef.current) {
                didInitialScrollRef.current = true;
                // Snap to bottom multiple times to defeat FlatList
                // virtualization: the first scrollToEnd may target a partial
                // content height (only windowed items are mounted), the rAF
                // retry catches the height after items mount, and the
                // setTimeout retry catches any remaining late layout from
                // images / variable-height bubbles. Reveal the chat only on
                // the last attempt so the user never sees the top.
                listRef.current?.scrollToEnd({ animated: false });
                requestAnimationFrame(() => {
                  listRef.current?.scrollToEnd({ animated: false });
                });
                setTimeout(() => {
                  listRef.current?.scrollToEnd({ animated: false });
                  setChatReady(true);
                }, 60);
              } else {
                listRef.current?.scrollToEnd({ animated: true });
              }
            }}
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => {
                listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.4 });
              }, 120);
            }}
            showsVerticalScrollIndicator={false}
          />

          {/* Input bar */}
          <View
            style={[
              styles.composerWrap,
              {
                paddingBottom: Math.max(insets.bottom, Spacing.sm),
                backgroundColor: colors.backgroundPrimary,
              },
            ]}
          >
            {/* GIF / sticker button */}
            <PressableScale
              style={styles.gifBtn}
              onPress={() => setGifPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Send GIF"
            >
              <GifIcon size={24} color={colors.textPrimary} />
            </PressableScale>

            {/* Input field with send arrow inside */}
            <View style={styles.inputColumn}>
              {replyingTo && (
                <View style={styles.replyChipWrap}>
                  <ReplyPreviewChip
                    parent={replyingTo}
                    onClear={() => setReplyingTo(null)}
                  />
                </View>
              )}
              <View style={[styles.inputRow, { borderColor: colors.gray80, backgroundColor: colors.backgroundPrimary }]}>
                {stagedGif && (
                  <View style={styles.stagedGifWrap}>
                    <ExpoImage
                      source={{ uri: stagedGif.url }}
                      style={styles.stagedGifImage}
                      contentFit="cover"
                    />
                    <Pressable
                      style={styles.stagedGifRemove}
                      onPress={() => setStagedGif(null)}
                      accessibilityRole="button"
                      accessibilityLabel="Remove GIF"
                      hitSlop={6}
                    >
                      <CloseIcon size={14} color={Colors.white} />
                    </Pressable>
                  </View>
                )}
                <TextInput
                  ref={inputRef}
                  style={[styles.composer, { color: colors.textPrimary }]}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={replyingTo ? 'Reply...' : 'Say something...'}
                  placeholderTextColor={colors.gray80}
                  multiline
                  scrollEnabled={false}
                  maxLength={2000}
                  accessibilityLabel="Message input"
                />
              <Pressable
                style={({ pressed }) => [
                  styles.sendBtn,
                  { backgroundColor: colors.buttonPrimary },
                  !draft.trim() && !stagedGif && styles.sendBtnQuiet,
                  pressed && (draft.trim() || stagedGif) ? styles.sendBtnPressed : null,
                ]}
                onPress={onSend}
                disabled={!draft.trim() && !stagedGif}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={draft.trim() || stagedGif ? colors.textPrimaryInverted : Colors.gray60}
                />
              </Pressable>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex:  { flex: 1, backgroundColor: Colors.white },
  inner: { flex: 1, backgroundColor: Colors.white },

  // ── Welcome block ─────────────────────────────────────────────────────────
  welcomeBlock: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.xs,
  },
  welcomeDate: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.gray40,
  },
  welcomeTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.8,
    color: Colors.black,
  },
  welcomeMeta: { gap: 2, alignItems: 'center' },
  welcomeMetaText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.gray20,
  },

  // ── List ──────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  // ── System connection card ────────────────────────────────────────────────
  connectionRow: {
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
    paddingRight: Spacing.sm,
  },
  connectionCard: {
    width: '55%',
    height: 246,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    justifyContent: 'flex-start',
    transform: [{ rotate: '-5deg' }],
  },
  connectionQuestion: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    lineHeight: 18,
    opacity: 0.75,
  },
  connectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  connectionLikeBadge: { position: 'absolute', left: 12, bottom: -12 },
  connectionAvatarRing: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  connectionHandle: { fontFamily: FontFamily.bold, fontSize: 12, lineHeight: 16 },
  connectionPronouns: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 16 },
  connectionAnswer: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md, lineHeight: 22 },

  // ── Outgoing (me) ─────────────────────────────────────────────────────────
  rowMe: { alignItems: 'flex-end', marginBottom: Spacing.md },
  rowMeTight: { marginBottom: 4 },
  bubbleMeWrap: { maxWidth: '80%', alignItems: 'flex-end', position: 'relative', transformOrigin: 'bottom right' },
  bubbleMe: {
    backgroundColor: Colors.blue,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  bubbleMeFirst: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 2,
  },
  bubbleMeContinuation: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 2,
  },
  bubbleMeText: { fontFamily: FontFamily.medium, fontSize: 16, lineHeight: 20, color: Colors.white },
  bubbleMeGif: {
    width: 220,
    height: 220,
    borderRadius: 24,
    backgroundColor: Colors.gray100,
    alignSelf: 'flex-end',
  },
  quotedWrap: { alignSelf: 'stretch', marginBottom: 4, minWidth: 240 },


  // ── Incoming (others) ─────────────────────────────────────────────────────
  rowThem: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, marginBottom: Spacing.md },
  rowThemTight: { marginBottom: 4 },
  bubbleThemWrap: { position: 'relative', alignItems: 'flex-start' },
  avatarSlot: { width: 32, height: 32 },
  themContent: { flex: 1, maxWidth: '82%', gap: 3 },

  // Name chip above first bubble
  nameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    alignSelf: 'flex-start',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    height: 24,
    marginBottom: 2,
  },
  nameChipHandle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.blue,
    letterSpacing: -0.24,
  },
  nameChipPronouns: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.blue,
  },

  // Bubble base
  bubbleThem: {
    backgroundColor: Colors.gray100,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  // First bubble in a group: tl=16
  bubbleThemFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 24,
  },
  // Continuation bubble: tl=2
  bubbleThemContinuation: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 24,
  },
  bubbleThemText: { fontFamily: FontFamily.medium, fontSize: 16, lineHeight: 20, color: Colors.black },

  // ── Composer ──────────────────────────────────────────────────────────────
  composerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.white,
  },
  gifBtn: {
    width: 48,
    height: 48,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.gray60,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputColumn: { flex: 1, gap: 6 },
  replyChipWrap: { marginBottom: 0 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gray80,
    borderRadius: Radius.full,
    paddingLeft: Spacing.md,
    paddingRight: 6,
    paddingVertical: 6,
    backgroundColor: Colors.white,
    maxHeight: 140,
    minHeight: 48,
  },
  composer: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.black,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  stagedGifWrap: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.gray100,
    marginRight: Spacing.sm,
    alignSelf: 'center',
  },
  stagedGifImage: { width: '100%', height: '100%' },
  stagedGifRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  sendBtnQuiet: { backgroundColor: 'transparent' },
  sendBtnPressed: { opacity: 0.9 },
});
