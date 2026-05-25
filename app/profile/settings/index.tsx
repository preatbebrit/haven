import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { AppHeader } from '@/components/ui/app-header';
import { CheckIcon } from '@/components/ui/icons/check-icon';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useCurrentUser } from '@/contexts/current-user-context';
import { useFriends } from '@/contexts/friends-context';
import { useLock } from '@/contexts/lock-context';
import { useDeleteAccount } from '@/hooks/use-delete-account';
import { useTheme } from '@/hooks/use-theme';
import { OUT_STATUS_ANSWER_LABELS } from '@/lib/profile-display';
import { type ThemeMode } from '@/lib/theme-mode-storage';

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
  const { mode: themeMode, setMode: setThemeMode, colors } = useTheme();
  const { me, currentUser } = useCurrentUser();
  const { signOut } = useAuth();
  const { hasActivePin } = useLock();
  const { state: deleteState, deleteAccount, dismissError } = useDeleteAccount();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  // 'warn' = data-fate disclosure; 'confirm' = typed-username confirmation.
  const [deleteStep, setDeleteStep] = useState<'warn' | 'confirm'>('warn');
  const [confirmText, setConfirmText] = useState('');

  const { currentUserId, shares } = useFriends();
  const shareCounts = useMemo(() => {
    const counts = { gallery: 0, prompts: 0, identity: 0 };
    for (const s of shares) {
      if (s.ownerId !== currentUserId) continue;
      counts[s.kind] += 1;
    }
    return counts;
  }, [shares, currentUserId]);

  // Sign-out flips me to null between renders. All hooks above must run
  // unconditionally on every render — gate the rest of the body here.
  if (!me) return null;

  const currentHandle = (currentUser?.username ?? '').trim() || me.handle;
  const pronounsLabel =
    (currentUser?.pronouns_custom ?? '').trim() ||
    currentUser?.pronoun_preset ||
    PLACEHOLDER_PRONOUNS;
  const outStatusLabel = currentUser?.out_status
    ? OUT_STATUS_ANSWER_LABELS[currentUser.out_status]
    : '—';
  const acceptingLabel = currentUser?.accepting_environment ?? '—';
  const lockLabel = hasActivePin ? 'On' : 'Off';
  const identityTags = currentUser?.identity_tags ?? [];
  const effectiveIdentities =
    identityTags.length > 0 ? identityTags : PLACEHOLDER_IDENTITIES;
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

  function openDeleteFlow() {
    setDeleteStep('warn');
    setConfirmText('');
    dismissError();
    setDeleteModalOpen(true);
  }

  function closeDeleteFlow() {
    if (deleteState.status === 'submitting') return;
    setDeleteModalOpen(false);
  }

  // Case-insensitive match. Accept either form (with or without the leading @)
  // since users see the handle as "@handle" in the row above.
  const normalizedHandle = currentHandle.trim().toLowerCase();
  const normalizedConfirm = confirmText.trim().replace(/^@/, '').toLowerCase();
  const confirmMatches =
    normalizedHandle.length > 0 && normalizedConfirm === normalizedHandle;

  async function handleConfirmDelete() {
    if (!confirmMatches) return;
    const result = await deleteAccount();
    if (result.ok) {
      setDeleteModalOpen(false);
      router.replace('/');
    }
    // On failure: useDeleteAccount has already set state.status='error'.
    // The modal stays open and renders the error inline.
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
              value={currentUser?.date_of_birth || '—'}
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
              label="House Rules"
              onPress={() => router.push('/house-rules?source=settings')}
            />
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
              onPress={openDeleteFlow}
            />
          </SettingsSection>
        </ScrollView>

        <DeleteAccountModal
          visible={deleteModalOpen}
          step={deleteStep}
          handle={currentHandle}
          confirmText={confirmText}
          confirmMatches={confirmMatches}
          submitting={deleteState.status === 'submitting'}
          errorMessage={
            deleteState.status === 'error' ? deleteState.error.message : null
          }
          onAdvance={() => {
            dismissError();
            setDeleteStep('confirm');
          }}
          onChangeConfirm={(t) => {
            if (deleteState.status === 'error') dismissError();
            setConfirmText(t);
          }}
          onSubmit={handleConfirmDelete}
          onClose={closeDeleteFlow}
          onBack={() => {
            dismissError();
            setDeleteStep('warn');
          }}
        />
      </View>
    </>
  );
}

type DeleteAccountModalProps = {
  visible: boolean;
  step: 'warn' | 'confirm';
  handle: string;
  confirmText: string;
  confirmMatches: boolean;
  submitting: boolean;
  errorMessage: string | null;
  onAdvance: () => void;
  onChangeConfirm: (next: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onBack: () => void;
};

// Two-step modal: data-fate disclosure → typed-username confirmation.
// Honest copy is intentional — see plan §4. Lists what's deleted and what's
// retained anonymized so the user can't be surprised about messages
// continuing to exist (attributed to "Deleted User") or reports being kept.
function DeleteAccountModal({
  visible,
  step,
  handle,
  confirmText,
  confirmMatches,
  submitting,
  errorMessage,
  onAdvance,
  onChangeConfirm,
  onSubmit,
  onClose,
  onBack,
}: DeleteAccountModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={modalStyles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={modalStyles.kavRoot}
          pointerEvents="box-none"
        >
          <View
            style={[
              modalStyles.sheet,
              {
                backgroundColor: colors.backgroundPrimary,
                paddingBottom: Math.max(insets.bottom + Spacing.md, Spacing.lg),
              },
            ]}
          >
            {step === 'warn' ? (
              <WarnStep
                colors={colors}
                onCancel={onClose}
                onContinue={onAdvance}
              />
            ) : (
              <ConfirmStep
                colors={colors}
                handle={handle}
                confirmText={confirmText}
                confirmMatches={confirmMatches}
                submitting={submitting}
                errorMessage={errorMessage}
                onChangeConfirm={onChangeConfirm}
                onSubmit={onSubmit}
                onBack={onBack}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function WarnStep({
  colors,
  onCancel,
  onContinue,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  onCancel: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <Text style={[modalStyles.title, { color: colors.textPrimary }]}>
        Delete your account?
      </Text>
      <Text style={[modalStyles.subtitle, { color: colors.textSecondary }]}>
        This cannot be undone.
      </Text>

      <View style={modalStyles.section}>
        <Text style={[modalStyles.sectionTitle, { color: colors.textPrimary }]}>
          We will delete:
        </Text>
        {[
          'Your profile, pronouns, identity, and bio',
          'Your photos and prompt answers',
          'Your friends list, top friends, and who you’ve shared with',
          'Your blocks',
        ].map((line) => (
          <BulletLine key={line} text={line} color={colors.textPrimary} />
        ))}
      </View>

      <View style={modalStyles.section}>
        <Text style={[modalStyles.sectionTitle, { color: colors.textPrimary }]}>
          We will keep, with your name removed:
        </Text>
        {[
          'Messages you’ve sent in chats — others will see them as “Deleted User”',
          'Reports you’ve filed and reports filed about you',
        ].map((line) => (
          <BulletLine key={line} text={line} color={colors.textPrimary} />
        ))}
      </View>

      <View style={modalStyles.buttonRow}>
        <ModalButton label="Cancel" variant="secondary" onPress={onCancel} />
        <ModalButton
          label="Continue"
          variant="destructive"
          onPress={onContinue}
        />
      </View>
    </>
  );
}

function ConfirmStep({
  colors,
  handle,
  confirmText,
  confirmMatches,
  submitting,
  errorMessage,
  onChangeConfirm,
  onSubmit,
  onBack,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  handle: string;
  confirmText: string;
  confirmMatches: boolean;
  submitting: boolean;
  errorMessage: string | null;
  onChangeConfirm: (next: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <Text style={[modalStyles.title, { color: colors.textPrimary }]}>
        Type your username to confirm
      </Text>
      <Text style={[modalStyles.subtitle, { color: colors.textSecondary }]}>
        Enter @{handle} to permanently delete your account.
      </Text>

      <TextInput
        value={confirmText}
        onChangeText={onChangeConfirm}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        editable={!submitting}
        placeholder={`@${handle}`}
        placeholderTextColor={colors.textTertiary}
        style={[
          modalStyles.input,
          {
            color: colors.textPrimary,
            borderColor: colors.gray80,
            backgroundColor: colors.backgroundPrimary,
          },
        ]}
        accessibilityLabel="Type your username to confirm deletion"
      />

      {errorMessage ? (
        <Text style={modalStyles.errorText}>{errorMessage}</Text>
      ) : null}

      <View style={modalStyles.buttonRow}>
        <ModalButton
          label="Back"
          variant="secondary"
          onPress={onBack}
          disabled={submitting}
        />
        <ModalButton
          label={submitting ? 'Deleting…' : 'Delete account'}
          variant="destructive"
          onPress={onSubmit}
          disabled={!confirmMatches || submitting}
          loading={submitting}
        />
      </View>
    </>
  );
}

function BulletLine({ text, color }: { text: string; color: string }) {
  return (
    <View style={modalStyles.bulletRow}>
      <Text style={[modalStyles.bullet, { color }]}>•</Text>
      <Text style={[modalStyles.bulletText, { color }]}>{text}</Text>
    </View>
  );
}

function ModalButton({
  label,
  variant,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  variant: 'secondary' | 'destructive';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const bg =
    variant === 'destructive'
      ? Colors.cherry
      : colors.gray100;
  const fg =
    variant === 'destructive' ? Colors.white : colors.textPrimary;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        modalStyles.button,
        {
          backgroundColor: bg,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <Text style={[modalStyles.buttonLabel, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
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

const modalStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  kavRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    lineHeight: 28,
    letterSpacing: -0.48,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    lineHeight: 18,
    letterSpacing: -0.14,
    marginBottom: Spacing.xs / 2,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'flex-start',
  },
  bullet: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    lineHeight: 20,
    width: 12,
  },
  bulletText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  errorText: {
    color: Colors.cherry,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    lineHeight: 20,
    letterSpacing: -0.32,
  },
});
