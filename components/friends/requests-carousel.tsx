import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeOut,
  LinearTransition,
  useAnimatedScrollHandler,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

import { FriendTileGlow } from '@/components/profile/friend-tile-glow';
import { GenderAvatar, getAvatarColors } from '@/components/ui/gender-avatar';
import { SegmentedPagination } from '@/components/ui/segmented-pagination';
import { useFriends } from '@/contexts/friends-context';
import { useNotificationsContext } from '@/contexts/notifications-context';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FriendRequest } from '@/lib/friend-requests-storage';
import { pairId } from '@/lib/friends-storage';
import { getProfileById } from '@/lib/profile-directory';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = Spacing.md;
const CARD_WIDTH = SCREEN_WIDTH - Spacing.md * 2;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

type Props = {
  /** Called after a request is accepted with the new friend's id and handle. */
  onAccepted?: (info: { id: string; handle: string }) => void;
};

export function RequestsCarousel({ onAccepted }: Props = {}) {
  const { colors } = useTheme();
  const { currentUserId, incomingRequests, acceptFriendRequest, declineFriendRequest } = useFriends();
  const { markSeen, seenIds } = useNotificationsContext();
  const scrollOffset = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollOffset.value = e.contentOffset.x;
    },
  });
  const pagerProgress = useDerivedValue(() =>
    SNAP_INTERVAL > 0 ? scrollOffset.value / SNAP_INTERVAL : 0,
  );

  // Glow stays on for every pending tile during the session. Mark-seen happens
  // when the user leaves /friends (handled in friends/index.tsx) or when a
  // tile is dismissed via Accept/Reject (the request disappears from `all`).

  if (incomingRequests.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Friend Requests</Text>

      <Animated.ScrollView
        horizontal
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {incomingRequests.map((item, index) => {
          const profile = getProfileById(item.senderId);
          const handle = profile?.handle ?? item.senderId;
          return (
            <Animated.View
              key={item.id}
              exiting={FadeOut.duration(220)}
              layout={LinearTransition.duration(260)}
              style={[
                styles.cardSlot,
                index < incomingRequests.length - 1 && { marginRight: CARD_GAP },
              ]}
            >
              <RequestCard
                request={item}
                unseen={!seenIds.has(`fr-recv:${item.id}`)}
                onAccept={() => {
                  acceptFriendRequest(item.id);
                  // User just took the action — no need to re-notify them of a
                  // "new friend" via the badge. Mark seen now so the count
                  // doesn't bump up only for the user to clear it themselves.
                  const friendshipId = pairId(currentUserId, item.senderId).id;
                  markSeen([`friend-new:${friendshipId}`]);
                  onAccepted?.({ id: item.senderId, handle });
                }}
                onReject={() => declineFriendRequest(item.id)}
              />
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      {incomingRequests.length > 1 ? (
        <View style={styles.pagination}>
          <SegmentedPagination count={incomingRequests.length} progress={pagerProgress} />
        </View>
      ) : null}
    </View>
  );
}

function RequestCard({
  request,
  unseen,
  onAccept,
  onReject,
}: {
  request: FriendRequest;
  unseen: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const { colors } = useTheme();
  const profile = getProfileById(request.senderId);
  const handle = profile?.handle ?? request.senderId;
  const pronouns = profile?.pronouns ?? '';
  const symbol = profile?.avatarSymbol ?? 'nonbinary';
  const { bg, symbol: symColor } = getAvatarColors(request.senderId);

  return (
    <View
      style={[
        styles.card,
        { borderColor: colors.gray100, backgroundColor: colors.backgroundPrimary },
      ]}
    >
      <View style={styles.cardHeader}>
        <GenderAvatar symbol={symbol} size={40} bgColor={bg} symbolColor={symColor} />
        <Text style={[styles.handle, { color: colors.textPrimary }]} numberOfLines={1}>
          @{handle}
          {pronouns ? <Text style={[styles.pronouns, { color: colors.textSecondary }]}> ({pronouns})</Text> : null}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.6 }]}
          onPress={onReject}
          accessibilityRole="button"
          accessibilityLabel={`Reject friend request from @${handle}`}
        >
          <Text style={[styles.rejectLabel, { color: colors.textSecondary }]}>Reject</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.acceptBtn,
            { backgroundColor: colors.buttonPrimary },
            pressed && { opacity: 0.85 },
          ]}
          onPress={onAccept}
          accessibilityRole="button"
          accessibilityLabel={`Accept friend request from @${handle}`}
        >
          <Text style={[styles.acceptLabel, { color: colors.textPrimaryInverted }]}>Accept</Text>
        </Pressable>
      </View>
      <FriendTileGlow active={unseen} radius={20} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.8,
    color: Colors.black,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  cardSlot: {
    width: CARD_WIDTH,
  },
  card: {
    borderWidth: 2,
    borderColor: Colors.gray100,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    backgroundColor: Colors.white,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  handle: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.black,
    letterSpacing: -0.32,
  },
  pronouns: {
    fontFamily: FontFamily.medium,
    color: Colors.gray40,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rejectBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.gray40,
    letterSpacing: -0.32,
  },
  acceptBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.white,
    letterSpacing: -0.32,
  },
  pagination: {
    paddingHorizontal: Spacing.md,
  },
});
