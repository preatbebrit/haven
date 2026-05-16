import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useFriends } from '@/contexts/friends-context';
import { useNotificationsContext } from '@/contexts/notifications-context';
import { useRelationship } from '@/hooks/use-relationship';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pairId } from '@/lib/friends-storage';

type Variant = 'hero' | 'compact';

type Props = {
  targetId: string;
  variant: Variant;
};

export function FriendActionButton({ targetId, variant }: Props) {
  const { colors } = useTheme();
  const { state, request } = useRelationship(targetId);
  const {
    currentUserId,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
  } = useFriends();
  const { markSeen } = useNotificationsContext();

  if (state === 'self') return null;
  if (state === 'blocked' && variant === 'compact') return null;

  async function handleAdd() {
    const result = await sendFriendRequest(targetId);
    if (!result.ok) {
      if (result.reason === 'no-shared-chat') {
        Alert.alert(
          'Not in a shared chat',
          "You can only add friends from chats you've both been in.",
        );
      } else if (result.reason === 'already-friends') {
        Alert.alert('Already friends', `You and @${targetId} are already friends.`);
      } else if (result.reason === 'already-pending') {
        // No-op — UI already reflects this state.
      }
    }
  }

  function handleCancel() {
    if (!request) return;
    Alert.alert('Cancel request?', `Stop trying to friend @${targetId}?`, [
      { text: 'Keep request', style: 'cancel' },
      {
        text: 'Cancel request',
        style: 'destructive',
        onPress: () => cancelFriendRequest(request.id),
      },
    ]);
  }

  function handleAccept() {
    if (!request) return;
    acceptFriendRequest(request.id);
    // User just took the action — clear the "new friend" notification so the
    // profile badge doesn't bump for an event they triggered themselves.
    const friendshipId = pairId(currentUserId, targetId).id;
    markSeen([`friend-new:${friendshipId}`]);
  }

  function handleDecline() {
    if (!request) return;
    declineFriendRequest(request.id);
  }

  // ── COMPACT VARIANT ──────────────────────────────────────────────────────
  if (variant === 'compact') {
    if (state === 'stranger') {
      return (
        <Pressable
          style={({ pressed }) => [styles.compactPill, { backgroundColor: colors.buttonPrimary }, pressed && styles.pressed]}
          onPress={handleAdd}
          accessibilityRole="button"
          accessibilityLabel={`Add @${targetId} as a friend`}
          hitSlop={6}
        >
          <Ionicons name="person-add" size={14} color={colors.textPrimaryInverted} />
        </Pressable>
      );
    }
    if (state === 'pending-sent') {
      return (
        <Pressable
          style={({ pressed }) => [styles.compactPill, { backgroundColor: colors.gray100 }, pressed && styles.pressed]}
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel={`Cancel friend request to @${targetId}`}
          hitSlop={6}
        >
          <Ionicons name="checkmark" size={14} color={colors.textSecondary} />
        </Pressable>
      );
    }
    if (state === 'pending-received') {
      return (
        <View style={styles.compactRow}>
          <Pressable
            style={({ pressed }) => [styles.compactPill, styles.compactPillGreen, pressed && styles.pressed]}
            onPress={handleAccept}
            accessibilityRole="button"
            accessibilityLabel={`Accept friend request from @${targetId}`}
            hitSlop={6}
          >
            <Ionicons name="checkmark" size={14} color={Colors.black} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.compactPill,
              styles.compactPillOutline,
              { backgroundColor: colors.backgroundPrimary, borderColor: colors.gray80 },
              pressed && styles.pressed,
            ]}
            onPress={handleDecline}
            accessibilityRole="button"
            accessibilityLabel={`Decline friend request from @${targetId}`}
            hitSlop={6}
          >
            <Ionicons name="close" size={14} color={colors.textPrimary} />
          </Pressable>
        </View>
      );
    }
    if (state === 'friend') {
      return (
        <View style={[styles.compactPill, styles.compactPillFriend]}>
          <Ionicons name="checkmark" size={14} color={Colors.black} />
        </View>
      );
    }
    return null;
  }

  // ── HERO VARIANT ─────────────────────────────────────────────────────────
  if (state === 'stranger') {
    return (
      <Pressable
        style={({ pressed }) => [styles.heroBtn, { backgroundColor: colors.buttonPrimary }, pressed && styles.pressed]}
        onPress={handleAdd}
        accessibilityRole="button"
        accessibilityLabel={`Add @${targetId} as a friend`}
      >
        <Text style={[styles.heroLabelLight, { color: colors.textPrimaryInverted }]}>Add Friend</Text>
      </Pressable>
    );
  }
  if (state === 'pending-sent') {
    return (
      <Pressable
        style={({ pressed }) => [styles.heroBtn, { backgroundColor: colors.gray100 }, pressed && styles.pressed]}
        onPress={handleCancel}
        accessibilityRole="button"
        accessibilityLabel={`Cancel friend request to @${targetId}`}
      >
        <Text style={[styles.heroLabelGray, { color: colors.textSecondary }]}>Requested</Text>
      </Pressable>
    );
  }
  if (state === 'pending-received') {
    return (
      <View style={styles.heroPair}>
        <Pressable
          style={({ pressed }) => [styles.heroBtnPaired, styles.heroBtnGreen, pressed && styles.pressed]}
          onPress={handleAccept}
          accessibilityRole="button"
          accessibilityLabel={`Accept friend request from @${targetId}`}
        >
          <Ionicons name="checkmark" size={18} color={Colors.black} />
          <Text style={styles.heroLabelDark}>Accept</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.heroBtnPaired,
            styles.heroBtnOutline,
            { backgroundColor: colors.backgroundPrimary, borderColor: colors.gray100 },
            pressed && styles.pressed,
          ]}
          onPress={handleDecline}
          accessibilityRole="button"
          accessibilityLabel={`Decline friend request from @${targetId}`}
        >
          <Ionicons name="close" size={18} color={colors.textPrimary} />
          <Text style={[styles.heroLabelDark, { color: colors.textPrimary }]}>Decline</Text>
        </Pressable>
      </View>
    );
  }
  if (state === 'friend') {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.heroBtn,
          styles.heroBtnGhost,
          { backgroundColor: colors.backgroundPrimary, borderColor: colors.gray100 },
          pressed && styles.pressed,
        ]}
        onPress={() => {
          // Phase 5 wires the overflow sheet here.
          console.log('[friends] open overflow sheet for', targetId);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Manage friendship with @${targetId}`}
      >
        <View style={styles.iconSlot}>
          <Ionicons name="checkmark" size={20} color={colors.textPrimary} />
        </View>
        <Text style={[styles.heroLabelDark, { color: colors.textPrimary }]}>Friends</Text>
        <View style={styles.iconSlot}>
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textPrimary} />
        </View>
      </Pressable>
    );
  }
  if (state === 'blocked') {
    return (
      <Pressable
        style={({ pressed }) => [styles.heroBtn, { backgroundColor: colors.gray100 }, pressed && styles.pressed]}
        onPress={() => {
          // Phase 7 wires unblock via overflow sheet.
          console.log('[friends] unblock pressed for', targetId);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Unblock @${targetId}`}
      >
        <View style={styles.iconSlot} />
        <Text style={[styles.heroLabelGray, { color: colors.textSecondary }]}>Blocked — tap to unblock</Text>
        <View style={styles.iconSlot} />
      </Pressable>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroBtn: {
    height: 48,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg - 4,
    paddingVertical: 10,
  },
  heroBtnBlack: { backgroundColor: Colors.black },
  heroBtnGray: { backgroundColor: Colors.gray100 },
  heroBtnGhost: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.gray100,
  },
  heroLabelLight: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.32,
    color: Colors.white,
  },
  heroLabelDark: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.32,
    color: Colors.black,
  },
  heroLabelGray: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.32,
    color: Colors.gray40,
  },
  iconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pending-received variant pairs accept + decline side by side.
  heroPair: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  heroBtnPaired: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroBtnGreen: { backgroundColor: Colors.green },
  heroBtnOutline: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.gray100,
  },

  // ── Compact ───────────────────────────────────────────────────────────────
  compactPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactPillBlack: { backgroundColor: Colors.black },
  compactPillGray: { backgroundColor: Colors.gray100 },
  compactPillGreen: { backgroundColor: Colors.green },
  compactPillOutline: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray80,
  },
  compactPillFriend: {
    backgroundColor: Colors.green,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 4,
  },
});
