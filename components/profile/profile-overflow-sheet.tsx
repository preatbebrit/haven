import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { CloseIcon } from '@/components/ui/icons/close-icon';
import { ProfileIcon } from '@/components/ui/icons/profile-icon';
import { useFriends } from '@/contexts/friends-context';
import type { ShareKind } from '@/lib/profile-shares-storage';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  /** When false, only Block + Report rows render — the share/unfriend rows
   *  require an existing friendship to be meaningful. */
  isFriend: boolean;
  targetId: string;
  targetHandle: string;
  /** Whether I currently share MY identity pills with the target. */
  iShareIdentityWithThem: boolean;
  /** Whether I currently share MY gallery with the target. Controls the toggle label. */
  iShareGalleryWithThem: boolean;
  /** Whether I currently share MY past prompts with the target. */
  iSharePromptsWithThem: boolean;
  onClose: () => void;
};

const MENU_WIDTH = 251;
const OPEN = { duration: 200, easing: Easing.out(Easing.quad) } as const;
const CLOSE = { duration: 140, easing: Easing.in(Easing.quad) } as const;

/**
 * Anchored dropdown shown when the user taps the "Friend Status" pill on a
 * friend's profile.
 *
 * Visual treatment matches Figma 366:13350: black panel anchored to the
 * top-right under the hero's overflow button, with five rows
 * (Share Gallery, Share Prompt Answers, Unfriend, Block, Report) separated by
 * faint white dividers. Container styling, animation, and divider weights are
 * pulled from the chat long-press menu (`components/chat/focus-overlay.tsx`)
 * so the two menus feel like one system.
 *
 * Share toggles control MY direction only (me → target). Whether the friend
 * shares back is independent and managed by the friend on their own device.
 */
export function ProfileOverflowSheet({
  visible,
  isFriend,
  targetId,
  targetHandle,
  iShareIdentityWithThem,
  iShareGalleryWithThem,
  iSharePromptsWithThem,
  onClose,
}: Props) {
  if (!visible) return null;
  return (
    <ProfileOverflowSheetBody
      isFriend={isFriend}
      targetId={targetId}
      targetHandle={targetHandle}
      iShareIdentityWithThem={iShareIdentityWithThem}
      iShareGalleryWithThem={iShareGalleryWithThem}
      iSharePromptsWithThem={iSharePromptsWithThem}
      onClose={onClose}
    />
  );
}

function ProfileOverflowSheetBody({
  isFriend,
  targetId,
  targetHandle,
  iShareIdentityWithThem,
  iShareGalleryWithThem,
  iSharePromptsWithThem,
  onClose,
}: Omit<Props, 'visible'>) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { unfriend, blockUser, shareWith, unshareWith } = useFriends();

  const backdrop = useSharedValue(0);
  const menuOpacity = useSharedValue(0);
  const menuTranslate = useSharedValue(-6);

  useEffect(() => {
    backdrop.value = withTiming(1, OPEN);
    menuOpacity.value = withTiming(1, OPEN);
    menuTranslate.value = withTiming(0, OPEN);
  }, [backdrop, menuOpacity, menuTranslate]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const menuStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value,
    transform: [{ translateY: menuTranslate.value }],
  }));

  function handleClose() {
    backdrop.value = withTiming(0, CLOSE);
    menuOpacity.value = withTiming(0, CLOSE);
    setTimeout(onClose, CLOSE.duration);
  }

  async function toggleShare(kind: ShareKind, currentlyShared: boolean) {
    if (currentlyShared) {
      await unshareWith(targetId, kind);
    } else {
      await shareWith(targetId, kind);
    }
  }

  function handleUnfriend() {
    Alert.alert(`Unfriend @${targetHandle}?`, 'You can re-add them later if you share a chat.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unfriend',
        style: 'destructive',
        onPress: async () => {
          await unfriend(targetId);
          handleClose();
        },
      },
    ]);
  }

  function handleBlock() {
    Alert.alert(`Block @${targetHandle}?`, 'They will not be able to friend you again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          await blockUser(targetId);
          handleClose();
        },
      },
    ]);
  }

  function handleReport() {
    handleClose();
    // Wait for the close animation before pushing the report screen so the
    // dropdown isn't visibly stacked under the modal during the transition.
    setTimeout(() => {
      router.push({
        pathname: '/report',
        params: { reportedId: targetId, reportedHandle: targetHandle },
      });
    }, CLOSE.duration);
  }

  return (
    <Modal transparent visible onRequestClose={handleClose} statusBarTranslucent animationType="none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
        <Animated.View
          // The hero's ⋯ button sits at insets.top + 8 with a 48px tap target;
          // anchor the dropdown right under it with an 8px gap.
          style={[styles.menuLayer, { top: insets.top + 8 + 48 + 8 }, menuStyle]}
          // Stop touches inside the menu from bubbling to the dismiss Pressable.
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.menu}>
            {isFriend ? (
              <>
                <MenuItem
                  label={iShareIdentityWithThem ? 'Stop sharing identity tags' : 'Share identity tags'}
                  icon={
                    iShareIdentityWithThem ? (
                      <CloseIcon size={22} color={Colors.white} />
                    ) : (
                      <ProfileIcon size={22} color={Colors.white} />
                    )
                  }
                  onPress={() => toggleShare('identity', iShareIdentityWithThem)}
                />
                <Divider />
                <MenuItem
                  label={iShareGalleryWithThem ? 'Stop sharing gallery' : 'Share gallery'}
                  icon={
                    iShareGalleryWithThem ? (
                      <CloseIcon size={22} color={Colors.white} />
                    ) : (
                      <GalleryIcon color={Colors.white} />
                    )
                  }
                  onPress={() => toggleShare('gallery', iShareGalleryWithThem)}
                />
                <Divider />
                <MenuItem
                  label={iSharePromptsWithThem ? 'Stop sharing prompts' : 'Share prompt answers'}
                  icon={
                    iSharePromptsWithThem ? (
                      <CloseIcon size={22} color={Colors.white} />
                    ) : (
                      <PromptIcon color={Colors.white} />
                    )
                  }
                  onPress={() => toggleShare('prompts', iSharePromptsWithThem)}
                />
                <Divider />
                <MenuItem
                  label="Unfriend"
                  icon={<UnfriendIcon color={Colors.white} />}
                  onPress={handleUnfriend}
                />
                <Divider />
              </>
            ) : null}
            <MenuItem
              label="Block"
              destructive
              icon={<BlockIcon color={Colors.cherry} />}
              onPress={handleBlock}
            />
            <Divider />
            <MenuItem
              label="Report"
              destructive
              icon={<WarningIcon color={Colors.cherry} />}
              onPress={handleReport}
            />
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function MenuItem({
  label,
  icon,
  onPress,
  destructive,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.6 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.menuItemText, destructive && { color: Colors.cherry }]}>{label}</Text>
      {icon}
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.menuDivider} />;
}

// SVG icon paths from designer's exported assets (Friends Status Menu Icon set).

function GalleryIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={24} height={24} fill="none">
      <Rect x={2} y={2} width={20} height={20} rx={3} stroke={color} strokeWidth={2} />
      <Path d="M2 18.5L7.5 13L12 16.5L17.5 9L22 15.5" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path
        d="M10 4.5L9 6.5L7.5 7.5L9 8.5L10 10L11 8.5L12.5 7.5L11 6.5L10 4.5Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PromptIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={24} height={24} fill="none">
      <Rect x={4} y={2} width={16} height={20} rx={3} stroke={color} strokeWidth={2} />
      <Path
        d="M11.3203 10.045C11.3203 9.565 11.3803 9.15 11.5953 8.77C11.8653 8.23 12.2903 8.095 12.7703 7.585C13.0353 7.29 13.1053 7.005 13.1053 6.655C13.1053 6.4 13.0453 6.18 12.9103 6.015C12.6953 5.745 12.3503 5.65 11.9953 5.65C11.6703 5.65 11.3653 5.735 11.1753 5.915C10.9653 6.09 10.8753 6.355 10.8803 6.655H9.78027C9.83527 6.035 10.1053 5.45 10.5603 5.11C10.9453 4.805 11.4653 4.655 11.9603 4.655C12.6653 4.655 13.3303 4.86 13.7503 5.355C14.0553 5.7 14.2153 6.165 14.2153 6.635C14.2153 7.275 13.9153 7.815 13.4953 8.255C13.1653 8.605 12.7903 8.83 12.6053 9.145C12.4253 9.455 12.4303 9.64 12.4303 10.045H11.3203ZM11.3253 12V10.79H12.4303V12H11.3253Z"
        fill={color}
      />
      <Path d="M7 15H17" stroke={color} />
      <Path d="M7 18H13" stroke={color} />
    </Svg>
  );
}

function UnfriendIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={24} height={24} fill="none">
      <Path
        d="M8.56465 6.7743C9.66502 6.67803 10.6314 7.44953 10.7231 8.49751C10.8147 9.54548 9.99704 10.4731 8.89668 10.5693C7.79631 10.6656 6.82996 9.8941 6.73828 8.84613C6.64659 7.79816 7.46429 6.87057 8.56465 6.7743Z"
        stroke={color}
        strokeWidth={1.4}
      />
      <Path
        d="M15.4357 5.9743C16.5361 6.07057 17.3538 6.99816 17.2621 8.04613C17.1704 9.0941 16.2041 9.86561 15.1037 9.76934C14.0034 9.67307 13.1857 8.74548 13.2773 7.69751C13.369 6.64954 14.3354 5.87803 15.4357 5.9743Z"
        stroke={color}
        strokeWidth={1.4}
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.9992 12.396C12.8633 11.8659 13.9268 11.6023 15.0402 11.6997C17.5498 11.9195 19.5616 13.9439 19.3498 16.3667C19.3138 16.778 19.2143 17.1634 18.9953 17.4751C18.7591 17.8112 18.4321 17.993 18.0832 18.065C17.7615 18.1313 17.427 18.1037 17.132 18.0572C16.8329 18.0099 16.5067 17.9318 16.1926 17.856C15.6581 17.7271 15.1092 17.5953 14.5285 17.5445C13.9479 17.4937 13.3848 17.5279 12.8361 17.562C12.6517 17.5735 12.4649 17.5844 12.2873 17.5913C12.1861 17.5953 12.0895 17.5767 12.0012 17.5415C11.9126 17.577 11.8155 17.5963 11.714 17.5923C11.536 17.5854 11.3491 17.5735 11.1642 17.562C10.7527 17.5364 10.3326 17.5107 9.9035 17.521L9.47088 17.5445C8.89036 17.5953 8.34212 17.7271 7.8078 17.856C7.49339 17.9318 7.16675 18.0099 6.86737 18.0572C6.57229 18.1037 6.238 18.1313 5.9162 18.065C5.56733 17.9929 5.24021 17.8111 5.00409 17.4751C4.78516 17.1634 4.6856 16.778 4.6496 16.3667C4.43779 13.9438 6.45038 11.9193 8.96014 11.6997C10.0731 11.6024 11.1353 11.8663 11.9992 12.396ZM9.26092 13.0825L9.08221 13.0943C7.19072 13.2597 5.91325 14.7356 6.0451 16.2447C6.06997 16.5285 6.12696 16.6393 6.14862 16.6704C6.15291 16.6765 6.15105 16.6839 6.1994 16.6939C6.27526 16.7094 6.41275 16.7117 6.6496 16.6743C6.88219 16.6376 7.15006 16.5742 7.47967 16.4947C8.00338 16.3683 8.6497 16.2112 9.34979 16.1499L9.61053 16.1314C9.738 16.1245 9.86385 16.1221 9.98749 16.1206C9.96761 15.9346 9.96851 15.7409 9.98553 15.5464C10.0576 14.7248 10.38 13.9861 10.8703 13.3814C10.3918 13.1702 9.84265 13.0589 9.26092 13.0825ZM14.9181 13.0943C13.9576 13.0102 13.074 13.294 12.4318 13.7974L12.216 13.9829C11.7378 14.4356 11.436 15.0209 11.3791 15.6685C11.3506 15.9941 11.403 16.0998 11.4152 16.1187C11.4219 16.124 11.4943 16.1776 11.7814 16.1939C11.8586 16.1983 11.931 16.2176 11.9992 16.2447C12.0718 16.2154 12.15 16.1961 12.2326 16.1929C12.3911 16.1867 12.5613 16.1763 12.7492 16.1646C13.2869 16.1311 13.9505 16.0887 14.6506 16.1499C15.3505 16.2112 15.9961 16.3683 16.5197 16.4947C16.8494 16.5742 17.1181 16.6376 17.3508 16.6743C17.5877 16.7117 17.7252 16.7095 17.801 16.6939C17.849 16.6839 17.8465 16.6765 17.8508 16.6704C17.8723 16.6396 17.9294 16.529 17.9543 16.2447C18.0861 14.7357 16.8094 13.2599 14.9181 13.0943Z"
        fill={color}
      />
    </Svg>
  );
}

function BlockIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={24} height={24} fill="none">
      <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M7 6L17.75 18.75" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function WarningIcon({ color }: { color: string }) {
  return (
    <Svg viewBox="0 0 24 24" width={24} height={24} fill="none">
      <Path
        d="M12 3L21.5263 19.5H2.47372L12 3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M11.4199 17V15.8722H12.581V17H11.4199ZM11.4199 15V9H12.581V15H11.4199Z"
        fill={color}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.55)' },

  menuLayer: {
    position: 'absolute',
    right: Spacing.md,
    width: MENU_WIDTH,
  },
  menu: {
    backgroundColor: Colors.black,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
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
    flexShrink: 1,
  },
  menuDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
});
