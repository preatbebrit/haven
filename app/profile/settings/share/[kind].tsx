import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/friends/empty-state';
import { ShareFriendRow } from '@/components/friends/share-friend-row';
import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { AppHeader } from '@/components/ui/app-header';
import type { GenderSymbol } from '@/components/ui/gender-avatar';
import { HoldToConfirmButton } from '@/components/ui/hold-to-confirm-button';
import { Toast } from '@/components/ui/toast';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useFriends } from '@/contexts/friends-context';
import { useTheme } from '@/hooks/use-theme';
import { getProfileById } from '@/lib/profile-directory';
import type { ShareKind } from '@/lib/profile-shares-storage';

// Hold the toast on-screen briefly before popping so the user sees the
// confirmation here instead of on /profile.
const SAVE_TOAST_HOLD_MS = 800;

type FriendItem = {
  id: string;
  handle: string;
  pronouns: string;
  avatarSymbol: GenderSymbol;
};

const TITLES: Record<ShareKind, string> = {
  gallery: 'Sharing gallery',
  prompts: 'Sharing prompt answers',
  identity: 'Sharing identity',
};

function isShareKind(value: unknown): value is ShareKind {
  return value === 'gallery' || value === 'prompts' || value === 'identity';
}

export default function SettingsShareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind: ShareKind = isShareKind(params.kind) ? params.kind : 'gallery';

  const { currentUserId, shares, shareWith, unshareWith } = useFriends();

  const sharedViewerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of shares) {
      if (s.ownerId === currentUserId && s.kind === kind) ids.add(s.viewerId);
    }
    return ids;
    // Snapshot once per mount — local edits drive `selected` after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const friends = useMemo<FriendItem[]>(() => {
    const items: FriendItem[] = [];
    for (const id of sharedViewerIds) {
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
    items.sort((a, b) =>
      a.handle.localeCompare(b.handle, undefined, { sensitivity: 'base' }),
    );
    return items;
  }, [sharedViewerIds]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(sharedViewerIds));
  const [saving, setSaving] = useState(false);
  // After hold-to-stop succeeds we stay on the page and switch into the
  // empty-state view — same visual as if the user had landed here with no
  // existing shares.
  const [allCleared, setAllCleared] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const backTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (backTimerRef.current !== null) clearTimeout(backTimerRef.current);
    },
    [],
  );

  const hasDiff = useMemo(() => {
    if (selected.size !== sharedViewerIds.size) return true;
    for (const id of selected) {
      if (!sharedViewerIds.has(id)) return true;
    }
    return false;
  }, [selected, sharedViewerIds]);

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
    for (const id of selected) if (!sharedViewerIds.has(id)) added.push(id);
    for (const id of sharedViewerIds) if (!selected.has(id)) removed.push(id);
    // Sequential to avoid the read-then-write race in profile-shares-storage.
    for (const id of added) await shareWith(id, kind);
    for (const id of removed) await unshareWith(id, kind);
    setToast('Changes saved');
    backTimerRef.current = setTimeout(() => router.back(), SAVE_TOAST_HOLD_MS);
  }

  async function handleStopAll() {
    if (sharedViewerIds.size === 0 || saving || allCleared) return;
    setSaving(true);
    for (const id of sharedViewerIds) {
      await unshareWith(id, kind);
    }
    setSelected(new Set());
    setAllCleared(true);
    setSaving(false);
  }

  const showStopAll = !allCleared && sharedViewerIds.size > 0;
  const showFriendsList = !allCleared && friends.length > 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Toast message={toast} onDismiss={() => setToast(null)} />
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

        <ScrollView
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            {
              // Reserve room for the docked Save + Stop-sharing buttons.
              // ~48 (Save) + 8 (gap) + 48 (Stop) + 16 (top pad) = 120
              paddingBottom: insets.bottom + (showStopAll ? 120 : 64) + Spacing.md,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {showFriendsList ? (
            <View style={styles.rows}>
              {friends.map((friend) => (
                <ShareFriendRow
                  key={friend.id}
                  friend={friend}
                  selected={selected.has(friend.id)}
                  onToggle={() => toggle(friend.id)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              title="Not sharing yet"
              body={`You haven't shared your ${kind === 'prompts' ? 'prompt answers' : kind} with anyone yet. Share from your profile to add friends here.`}
              ctaLabel="Go to profile"
              onCtaPress={() => router.dismissTo('/profile')}
            />
          )}
        </ScrollView>

        {showFriendsList ? (
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
            {showStopAll ? (
              <HoldToConfirmButton
                label="Stop sharing with all"
                holdingLabel="Hold to stop..."
                onConfirm={() => void handleStopAll()}
                style={[styles.stopAllBtn, { backgroundColor: colors.backgroundPrimary }]}
                labelStyle={styles.stopAllText}
                fillColor={Colors.cherry}
                spinnerColor={Colors.cherry}
                activeLabelColor={Colors.white}
                activeSpinnerColor={Colors.white}
                accessibilityLabel="Hold to stop sharing with all"
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  stopAllBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.cherry,
  },
  stopAllText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.32,
    color: Colors.cherry,
  },
  list: { flex: 1 },
  listContent: { paddingTop: Spacing.xs },
  rows: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  saveDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray80,
  },
});
