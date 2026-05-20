import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFriends } from '@/contexts/friends-context';
import { useNotificationsContext } from '@/contexts/notifications-context';
import { Colors, FontFamily, Radius, Spacing, TextStyle } from '@/constants/theme';
import { useResetAccount } from '@/hooks/use-reset-account';
import {
  clearAllFriendsData,
  seedBlock,
  seedFriends,
  seedPendingRequests,
  seedTopFriends,
} from '@/lib/dev-seed';
import { supabase } from '@/lib/supabase';

/**
 * __DEV__-only panel. Renders nothing in production builds.
 *
 * Exposes one-click seeders that bypass the normal request flow so we can
 * verify all UI states (stranger / pending / friend / blocked) without
 * having to drive a full multi-step interaction.
 */
export function DevSeedPanel() {
  if (!__DEV__) return null;
  const { reloadAll } = useFriends();
  const { clearSeen: clearNotificationsSeen } = useNotificationsContext();
  const resetAccount = useResetAccount();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await reloadAll();
    } finally {
      setBusy(false);
    }
  }

  async function restartFromWelcome() {
    if (busy) return;
    setBusy(true);
    try {
      // Sign out first so the AuthProvider session=null cascade clears
      // userId-keyed contexts (LockProvider in particular) — without this,
      // resetAccount wipes on-disk lock data but the in-memory PIN gate
      // stays armed, and the boot router treats us as signed-in and
      // bounces to chat-selection instead of welcome.
      try { await supabase.auth.signOut(); } catch { /* non-fatal */ }
      // Full local wipe — profile (and thus lockPin), friends, gallery, etc.
      await resetAccount();
      router.replace('/');
    } finally {
      setBusy(false);
    }
  }

  if (collapsed) {
    return (
      <Pressable
        style={({ pressed }) => [styles.collapsed, pressed && { opacity: 0.7 }]}
        onPress={() => setCollapsed(false)}
        accessibilityRole="button"
        accessibilityLabel="Open dev seed panel"
      >
        <Text style={styles.collapsedText}>DEV · Seed friends data</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>DEV · Friends seeders</Text>
        <Pressable onPress={() => setCollapsed(true)} hitSlop={8}>
          <Text style={styles.collapseBtn}>Hide</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <SeedButton label="Seed friends" onPress={() => run(seedFriends)} disabled={busy} />
        <SeedButton label="Seed pending" onPress={() => run(seedPendingRequests)} disabled={busy} />
      </View>
      <View style={styles.row}>
        <SeedButton label="Seed top 6" onPress={() => run(seedTopFriends)} disabled={busy} />
        <SeedButton label="Block Cindry Chan" onPress={() => run(() => seedBlock('Cindry Chan'))} disabled={busy} />
      </View>
      <View style={styles.row}>
        <SeedButton label="Restart from welcome" onPress={() => void restartFromWelcome()} disabled={busy} />
      </View>
      <View style={styles.row}>
        <SeedButton
          label="Clear all friends data"
          variant="danger"
          onPress={() =>
            run(async () => {
              await clearAllFriendsData();
              await clearNotificationsSeen();
            })
          }
          disabled={busy}
        />
      </View>
      <Text style={styles.hint}>
        Reload the screen after seeding to see updates everywhere.
      </Text>
    </View>
  );
}

function SeedButton({
  label,
  onPress,
  disabled,
  variant = 'default',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        variant === 'danger' && styles.btnDanger,
        pressed && !disabled && styles.btnPressed,
        disabled && styles.btnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.btnLabel, variant === 'danger' && styles.btnLabelDanger]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  collapsed: {
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.gray80,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
  },
  collapsedText: {
    ...TextStyle.captionBold,
    color: Colors.gray40,
    letterSpacing: -0.24,
  },

  panel: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.gray100,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...TextStyle.captionBold,
    color: Colors.black,
  },
  collapseBtn: {
    ...TextStyle.captionBold,
    color: Colors.gray40,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnDanger: {
    backgroundColor: Colors.cherry,
  },
  btnLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.white,
    textAlign: 'center',
  },
  btnLabelDanger: {
    color: Colors.white,
  },
  hint: {
    ...TextStyle.caption,
    color: Colors.gray40,
    marginTop: Spacing.xs,
  },
});
