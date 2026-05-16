import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/friends/empty-state';
import { AppHeader } from '@/components/ui/app-header';
import { GenderAvatar, getAvatarColors } from '@/components/ui/gender-avatar';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useFriends } from '@/contexts/friends-context';
import { useTheme } from '@/hooks/use-theme';
import { setPendingToast } from '@/lib/pending-toast';
import { getProfileById } from '@/lib/profile-directory';

export default function BlockedSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { currentUserId, blocks, unblockUser } = useFriends();

  const rows = useMemo(() => {
    return blocks
      .filter((b) => b.blockerId === currentUserId)
      .map((b) => {
        const profile = getProfileById(b.blockedId);
        return {
          id: b.blockedId,
          handle: profile?.handle ?? b.blockedId,
          pronouns: profile?.pronouns ?? '',
          avatarSymbol: profile?.avatarSymbol ?? 'nonbinary',
        };
      })
      .sort((a, b) =>
        a.handle.localeCompare(b.handle, undefined, { sensitivity: 'base' }),
      );
  }, [blocks, currentUserId]);

  function handleUnblock(id: string, handle: string) {
    Alert.alert(
      `Unblock @${handle}?`,
      'They will be able to see your shared content again and request to be friends.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            await unblockUser(id);
            setPendingToast(`Unblocked @${handle}`);
          },
        },
      ],
    );
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
          center={{ kind: 'title', title: 'Blocked users' }}
          right={{ kind: 'spacer' }}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {rows.length === 0 ? (
            <EmptyState
              title="Nobody blocked"
              body="When you block someone, they'll show up here. You can unblock them any time."
            />
          ) : (
            <View style={styles.list}>
              {rows.map((row) => {
                const { bg, symbol } = getAvatarColors(row.handle);
                return (
                  <View
                    key={row.id}
                    style={[styles.row, { borderColor: colors.gray100 }]}
                  >
                    <GenderAvatar
                      symbol={row.avatarSymbol}
                      size={32}
                      bgColor={bg}
                      symbolColor={symbol}
                    />
                    <View style={styles.info}>
                      <Text style={[styles.handle, { color: colors.textPrimary }]} numberOfLines={1}>
                        @{row.handle}
                      </Text>
                      {row.pronouns ? (
                        <Text style={[styles.pronouns, { color: colors.textSecondary }]} numberOfLines={1}>
                          ({row.pronouns})
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.unblockBtn,
                        { borderColor: colors.textPrimary },
                        pressed && styles.unblockBtnPressed,
                      ]}
                      onPress={() => handleUnblock(row.id, row.handle)}
                      accessibilityRole="button"
                      accessibilityLabel={`Unblock @${row.handle}`}
                    >
                      <Text style={[styles.unblockText, { color: colors.textPrimary }]}>Unblock</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  list: { gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.gray100,
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'nowrap',
  },
  handle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.32,
    color: Colors.black,
  },
  pronouns: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.gray40,
  },
  unblockBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.black,
  },
  unblockBtnPressed: { opacity: 0.6 },
  unblockText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    lineHeight: 16,
    color: Colors.black,
    letterSpacing: -0.26,
  },
});
