import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { AppHeader } from '@/components/ui/app-header';
import { CheckIcon } from '@/components/ui/icons/check-icon';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useCurrentUser } from '@/contexts/current-user-context';
import { useFriends } from '@/contexts/friends-context';
import { useLock } from '@/contexts/lock-context';
import { useResetAccount } from '@/hooks/use-reset-account';
import { useTheme } from '@/hooks/use-theme';
import { EMPTY_PROFILE, getProfile, type StoredProfile } from '@/lib/profile-storage';
import { type ThemeMode } from '@/lib/theme-mode-storage';

const OUT_STATUS_LABELS: Record<NonNullable<StoredProfile['outStatus']>, string> = {
  yes: 'Yes',
  no: 'No',
  'sort-of': 'Sort of',
};

const THEME_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: 'light', label: 'Light Mode' },
  { id: 'dark', label: 'Dark Mode' },
  { id: 'system', label: 'System Settings' },
];

// Placeholder values shown when the user hasn't picked their own yet — kept
// in sync with the mock tags on the profile screen so the two surfaces agree.
const PLACEHOLDER_PRONOUNS = 'They/them';
const PLACEHOLDER_IDENTITIES = ['Pangender', 'Out', 'AAPI', 'Neurodivergent'];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<StoredProfile>(EMPTY_PROFILE);
  const { mode: themeMode, setMode: setThemeMode, colors } = useTheme();
  const { me } = useCurrentUser();
  const { signOut } = useAuth();
  const { hasActivePin } = useLock();
  const resetAccount = useResetAccount();

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const p = await getProfile();
        if (!alive) return;
        setProfile(p);
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const { currentUserId, shares } = useFriends();
  const shareCounts = useMemo(() => {
    const counts = { gallery: 0, prompts: 0, identity: 0 };
    for (const s of shares) {
      if (s.ownerId !== currentUserId) continue;
      counts[s.kind] += 1;
    }
    return counts;
  }, [shares, currentUserId]);

  const currentHandle = profile.username.trim() || me.handle;
  const pronounsLabel =
    profile.pronounsCustom.trim() || profile.pronounPreset || PLACEHOLDER_PRONOUNS;
  const outStatusLabel = profile.outStatus ? OUT_STATUS_LABELS[profile.outStatus] : '—';
  const acceptingLabel = profile.acceptingEnvironment ?? '—';
  const lockLabel = hasActivePin ? 'On' : 'Off';
  const effectiveIdentities =
    profile.identities.length > 0 ? profile.identities : PLACEHOLDER_IDENTITIES;
  const identityLabel =
    effectiveIdentities.length === 1
      ? effectiveIdentities[0]
      : `${effectiveIdentities.length} selected`;

  function handleThemeChange(next: ThemeMode) {
    setThemeMode(next);
  }

  function handleSignOut() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/');
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This permanently removes your profile, chats, and friends from this device. (Server-side delete will be added with auth.)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await resetAccount();
            router.replace('/');
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
          center={{ kind: 'title', title: 'Settings' }}
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
          <SettingsSection title="Account info">
            <SettingsRow label="Username" value={`@${currentHandle}`} readOnly />
            <SettingsRow
              label="Birthday"
              value={profile.dateOfBirth || '—'}
              readOnly
            />
            <SettingsRow
              label="Pronouns"
              value={pronounsLabel}
              onPress={() => router.push('/profile/settings/pronouns')}
            />
            <SettingsRow
              label="Out Status"
              value={outStatusLabel}
              onPress={() => router.push('/profile/settings/out-status')}
            />
            <SettingsRow
              label="Accepting environment"
              value={acceptingLabel}
              onPress={() => router.push('/profile/settings/accepting-environment')}
            />
            <SettingsRow
              label="Identity"
              value={identityLabel}
              onPress={() => router.push('/profile/settings/identity')}
            />
          </SettingsSection>

          <SettingsSection title="Sharing">
            <SettingsRow
              label="Gallery shared with"
              value={`(${shareCounts.gallery})`}
              onPress={() =>
                router.push({
                  pathname: '/profile/settings/share/[kind]',
                  params: { kind: 'gallery' },
                })
              }
            />
            <SettingsRow
              label="Prompt answers shared with"
              value={`(${shareCounts.prompts})`}
              onPress={() =>
                router.push({
                  pathname: '/profile/settings/share/[kind]',
                  params: { kind: 'prompts' },
                })
              }
            />
            <SettingsRow
              label="Identity shared with"
              value={`(${shareCounts.identity})`}
              onPress={() =>
                router.push({
                  pathname: '/profile/settings/share/[kind]',
                  params: { kind: 'identity' },
                })
              }
            />
          </SettingsSection>

          <SettingsSection title="Privacy">
            <SettingsRow
              label="Lock Screen"
              value={lockLabel}
              onPress={() => router.push('/profile/settings/lock')}
            />
            <SettingsRow
              label="Blocked users"
              onPress={() => router.push('/profile/settings/blocked')}
            />
          </SettingsSection>

          <View style={styles.displaySection}>
            <Text style={[styles.displayTitle, { color: colors.textPrimary }]}>Display</Text>
            {THEME_OPTIONS.map(({ id, label }) => {
              const selected = themeMode === id;
              return (
                <Pressable
                  key={id}
                  style={({ pressed }) => [
                    styles.displayRow,
                    pressed && styles.displayRowPressed,
                  ]}
                  onPress={() => handleThemeChange(id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={label}
                >
                  <Text style={[styles.displayLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <View
                    style={[
                      styles.radioOuter,
                      selected && {
                        borderColor: colors.buttonPrimary,
                        backgroundColor: colors.buttonPrimary,
                      },
                    ]}
                  >
                    {selected ? (
                      <CheckIcon size={16} color={colors.textPrimaryInverted} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <SettingsSection title="Resources">
            <SettingsRow
              label="Resources"
              onPress={() => router.push('/profile/settings/resources')}
            />
          </SettingsSection>

          <SettingsSection title="Account">
            <SettingsRow label="Sign out" destructive onPress={handleSignOut} />
            <SettingsRow
              label="Delete account"
              destructive
              onPress={handleDeleteAccount}
            />
          </SettingsSection>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: Spacing.sm },
  displaySection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  displayTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    lineHeight: 20,
    letterSpacing: -0.32,
    marginBottom: Spacing.xs,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  displayRowPressed: { opacity: 0.6 },
  displayLabel: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  radioOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.gray60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
