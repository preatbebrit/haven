import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/friends/empty-state';
import { FriendListRow } from '@/components/friends/friend-list-row';
import { RequestsCarousel } from '@/components/friends/requests-carousel';
import { AppHeader } from '@/components/ui/app-header';
import { SearchIcon } from '@/components/ui/icons/search-icon';
import type { GenderSymbol } from '@/components/ui/gender-avatar';
import { Toast } from '@/components/ui/toast';
import { useActiveChat } from '@/contexts/active-chat-context';
import { useFriends } from '@/contexts/friends-context';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useNotifications } from '@/hooks/use-notifications';
import { useTheme } from '@/hooks/use-theme';
import { TOP_FRIENDS_SIZE } from '@/lib/top-friends-storage';
import { getProfileById } from '@/lib/profile-directory';

type FriendItem = {
  id: string;
  handle: string;
  pronouns: string;
  avatarSymbol: GenderSymbol;
};

export default function FriendsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { currentUserId, friendships, incomingRequests, topFriends, setTopFriendsSlot, bannedIds } = useFriends();
  const { all, markSeen, unreadByFriendId } = useNotifications();
  const { activeChatId } = useActiveChat();

  const goFindFriendsInChats = useCallback(() => {
    if (activeChatId) router.push('/chat');
    else router.replace('/(tabs)/chat-selection');
  }, [activeChatId, router]);

  // Pinned set: any friend with unread activity (the "New!" rows). Captured once
  // on focus so the order doesn't shift mid-session if state changes.
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  // Snapshot of friend IDs at focus time. Anything that appears in the live
  // `friendships` list but NOT in this snapshot was added during this focus
  // session (via the requests carousel, the Add/Accept button on a profile,
  // or any other path). Those friends get the "New!" treatment and float to
  // the top of the list until blur. Null = not yet snapshotted.
  const [initialFriendIds, setInitialFriendIds] = useState<Set<string> | null>(null);
  // Read friendships and unreadByFriendId through refs so the focus effect
  // snapshots only on focus, not every time these lists change. In particular,
  // accepting a request causes unreadByFriendId to briefly tick, which would
  // otherwise re-run the snapshot and include the just-added friend in
  // initialFriendIds — defeating the "New!" treatment for that friend.
  const friendshipsRef = useRef(friendships);
  useEffect(() => {
    friendshipsRef.current = friendships;
  });
  const unreadByFriendIdRef = useRef(unreadByFriendId);
  useEffect(() => {
    unreadByFriendIdRef.current = unreadByFriendId;
  });
  useFocusEffect(
    useCallback(() => {
      setPinnedIds(new Set(unreadByFriendIdRef.current.keys()));
      const ids = new Set<string>();
      for (const f of friendshipsRef.current) {
        if (f.userAId === currentUserId) ids.add(f.userBId);
        else if (f.userBId === currentUserId) ids.add(f.userAId);
      }
      setInitialFriendIds(ids);
      return () => {
        setInitialFriendIds(null);
      };
    }, [currentUserId]),
  );

  // Derived: friend IDs that weren't in the focus-time snapshot.
  const sessionAcceptedIds = useMemo(() => {
    if (!initialFriendIds) return new Set<string>();
    const ids = new Set<string>();
    for (const f of friendships) {
      let other: string | null = null;
      if (f.userAId === currentUserId) other = f.userBId;
      else if (f.userBId === currentUserId) other = f.userAId;
      if (other && !initialFriendIds.has(other)) ids.add(other);
    }
    return ids;
  }, [friendships, currentUserId, initialFriendIds]);

  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const handleFriendAccepted = useCallback(({ handle }: { id: string; handle: string }) => {
    setToast(`You and @${handle} are now friends!`);
  }, []);

  // On actual blur, mark every notification visible on this screen seen —
  // friend-list rows AND pending friend-request tiles. Both keep their glow
  // for the entire session and only clear when the user actually leaves.
  //
  // The `all` snapshot is read through a ref so accepts/declines don't
  // recreate this callback and fire the cleanup mid-session.
  const allRef = useRef(all);
  useEffect(() => {
    allRef.current = all;
  });
  useFocusEffect(
    useCallback(() => {
      return () => {
        const ids = allRef.current.map((n) => n.id);
        if (ids.length > 0) markSeen(ids);
      };
    }, [markSeen]),
  );

  const friends = useMemo<FriendItem[]>(() => {
    const otherIds = friendships.flatMap((f) => {
      if (f.userAId === currentUserId) return [f.userBId];
      if (f.userBId === currentUserId) return [f.userAId];
      return [];
    });
    const items: FriendItem[] = [];
    for (const id of otherIds) {
      if (bannedIds.has(id)) continue;
      const profile = getProfileById(id);
      if (profile) {
        items.push({
          id: profile.id,
          handle: profile.handle,
          pronouns: profile.pronouns,
          avatarSymbol: profile.avatarSymbol,
        });
      } else {
        items.push({ id, handle: id, pronouns: '', avatarSymbol: 'nonbinary' });
      }
    }
    // Pinned (unread-driven or accepted-this-session) first, then alphabetical
    // within each group.
    items.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id) || sessionAcceptedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id) || sessionAcceptedIds.has(b.id);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return a.handle.localeCompare(b.handle, undefined, { sensitivity: 'base' });
    });
    return items;
  }, [friendships, currentUserId, pinnedIds, sessionAcceptedIds, bannedIds]);

  const filtered = useMemo(() => {
    if (!query.trim()) return friends;
    const q = query.trim().toLowerCase();
    return friends.filter((f) => f.handle.toLowerCase().includes(q));
  }, [friends, query]);

  const favoriteIds = useMemo(() => new Set(topFriends.filter((id): id is string => !!id)), [topFriends]);

  function handleToggleFavorite(friendId: string) {
    if (favoriteIds.has(friendId)) {
      const idx = topFriends.findIndex((slot) => slot === friendId);
      if (idx >= 0) {
        setTopFriendsSlot(idx + 1, null);
      }
      return;
    }
    const firstEmpty = topFriends.findIndex((slot) => slot === null);
    if (firstEmpty === -1) return;
    setTopFriendsSlot(firstEmpty + 1, friendId);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { backgroundColor: colors.backgroundPrimary }]}>
        <Toast message={toast} onDismiss={() => setToast(null)} />
        <AppHeader
          left={{
            kind: 'icon',
            icon: <Ionicons name="arrow-back" size={20} color={colors.textPrimaryInverted} />,
            onPress: () => router.back(),
            accessibilityLabel: 'Go back',
          }}
          center={{ kind: 'title', title: 'Friends' }}
          right={{ kind: 'spacer' }}
        />

        <View
          style={[
            styles.searchWrap,
            { borderColor: colors.gray80, backgroundColor: colors.backgroundPrimary },
          ]}
        >
          <SearchIcon size={18} color={Colors.gray60} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={Colors.gray60}
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Search friends"
            returnKeyType="search"
          />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <RequestsCarousel onAccepted={handleFriendAccepted} />

          {incomingRequests.length > 0 ? (
            <View style={[styles.divider, { backgroundColor: colors.gray80 }]} />
          ) : null}

          <View style={styles.rows}>
            {friends.length === 0 ? (
              <EmptyState
                title="No friends yet"
                body="Connect with people in your chats to make friends. Their profile shows an Add Friend button when you share a chat."
                ctaLabel="Find friends in chats"
                onCtaPress={goFindFriendsInChats}
              />
            ) : filtered.length === 0 ? (
              <EmptyState title="No matches" body={`Nobody matches "${query.trim()}".`} />
            ) : (
              filtered.map((friend) => (
                <FriendListRow
                  key={friend.id}
                  friend={friend}
                  isFavorite={favoriteIds.has(friend.id)}
                  isNew={unreadByFriendId.has(friend.id) || sessionAcceptedIds.has(friend.id)}
                  onToggleFavorite={() => handleToggleFavorite(friend.id)}
                />
              ))
            )}

            {favoriteIds.size > 0 ? (
              <Text style={[styles.favoriteHint, { color: colors.textSecondary }]}>
                {favoriteIds.size} of {TOP_FRIENDS_SIZE} favorites pinned to your My Friends.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.gray80,
    backgroundColor: Colors.white,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.black,
    padding: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.lg,
  },
  rows: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  favoriteHint: {
    marginTop: Spacing.lg,
    textAlign: 'center',
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.gray40,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray80,
    marginHorizontal: Spacing.md,
  },
});
