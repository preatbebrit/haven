import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/friends/empty-state';
import { ShareFriendRow } from '@/components/friends/share-friend-row';
import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { AppHeader } from '@/components/ui/app-header';
import type { GenderSymbol } from '@/components/ui/gender-avatar';
import { SearchIcon } from '@/components/ui/icons/search-icon';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useActiveChat } from '@/contexts/active-chat-context';
import { useFriends } from '@/contexts/friends-context';
import { useTheme } from '@/hooks/use-theme';
import { setPendingToast } from '@/lib/pending-toast';
import { getProfileById } from '@/lib/profile-directory';
import type { ShareKind } from '@/lib/profile-shares-storage';

type FriendItem = {
  id: string;
  handle: string;
  pronouns: string;
  avatarSymbol: GenderSymbol;
};

const TITLES: Record<ShareKind, string> = {
  gallery: 'Share Gallery',
  prompts: 'Share Prompt Answers',
  identity: 'Share Identity',
};

function isShareKind(value: unknown): value is ShareKind {
  return value === 'gallery' || value === 'prompts' || value === 'identity';
}

export default function ShareWithScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind: ShareKind = isShareKind(params.kind) ? params.kind : 'gallery';

  const { currentUserId, friendships, shares, shareWith, unshareWith } = useFriends();
  const { activeChatId } = useActiveChat();
  const [query, setQuery] = useState('');

  const goFindFriendsInChats = useCallback(() => {
    if (activeChatId) router.push('/chat');
    else router.replace('/(tabs)/chat-selection');
  }, [activeChatId, router]);

  const friends = useMemo<FriendItem[]>(() => {
    const otherIds = friendships.flatMap((f) => {
      if (f.userAId === currentUserId) return [f.userBId];
      if (f.userBId === currentUserId) return [f.userAId];
      return [];
    });
    const items: FriendItem[] = [];
    for (const id of otherIds) {
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
    items.sort((a, b) => a.handle.localeCompare(b.handle, undefined, { sensitivity: 'base' }));
    return items;
  }, [friendships, currentUserId]);

  const initialSelectedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of shares) {
      if (s.ownerId === currentUserId && s.kind === kind) ids.add(s.viewerId);
    }
    return ids;
    // We intentionally only seed once per mount — local edits drive `selected` after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelectedIds));
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return friends;
    const q = query.trim().toLowerCase();
    return friends.filter((f) => f.handle.toLowerCase().includes(q));
  }, [friends, query]);

  const hasDiff = useMemo(() => {
    if (selected.size !== initialSelectedIds.size) return true;
    for (const id of selected) {
      if (!initialSelectedIds.has(id)) return true;
    }
    return false;
  }, [selected, initialSelectedIds]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!hasDiff || saving) return;
    setSaving(true);
    const added: string[] = [];
    const removed: string[] = [];
    for (const id of selected) {
      if (!initialSelectedIds.has(id)) added.push(id);
    }
    for (const id of initialSelectedIds) {
      if (!selected.has(id)) removed.push(id);
    }
    // Sequential to avoid the read-then-write race in profile-shares-storage.
    for (const id of added) await shareWith(id, kind);
    for (const id of removed) await unshareWith(id, kind);
    setPendingToast('Changes saved');
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { backgroundColor: colors.backgroundPrimary }]}>
        <AppHeader
          left={{
            kind: 'icon',
            icon: <Ionicons name="arrow-back" size={20} color={colors.textPrimaryInverted} />,
            onPress: () => router.back(),
            accessibilityLabel: 'Go back',
          }}
          center={{ kind: 'title', title: TITLES[kind] }}
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
            { paddingBottom: insets.bottom + 88 + Spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {friends.length === 0 ? (
            <EmptyState
              title="No friends yet"
              body="Add friends from your chats first — once you have friends, you can choose who to share with here."
              ctaLabel="Find friends in chats"
              onCtaPress={goFindFriendsInChats}
            />
          ) : filtered.length === 0 ? (
            <EmptyState title="No matches" body={`Nobody matches "${query.trim()}".`} />
          ) : (
            <View style={styles.rows}>
              {filtered.map((friend) => (
                <ShareFriendRow
                  key={friend.id}
                  friend={friend}
                  selected={selected.has(friend.id)}
                  onToggle={() => toggle(friend.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.saveDock,
            {
              paddingBottom: insets.bottom + Spacing.md,
              backgroundColor: colors.backgroundPrimary,
              borderTopColor: colors.gray80,
            },
          ]}
        >
          <PrimaryNextButton label="Save" inactive={!hasDiff || saving} onPress={handleSave} />
        </View>
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
    paddingTop: Spacing.xs,
  },
  rows: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  saveDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray80,
  },
});
