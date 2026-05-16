import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { AppHeader } from '@/components/ui/app-header';
import { HoldToConfirmButton } from '@/components/ui/hold-to-confirm-button';
import { PinPad } from '@/components/ui/pin-pad';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useLock } from '@/contexts/lock-context';
import { useTheme } from '@/hooks/use-theme';
import { setPendingToast } from '@/lib/pending-toast';
import { getProfile, setProfile } from '@/lib/profile-storage';

export default function LockSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const lock = useLock();

  const [enabled, setEnabled] = useState(false);
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    getProfile().then((p) => {
      if (!alive) return;
      setEnabled(Boolean(p.lockPin) && !p.lockSkipped);
    });
    return () => {
      alive = false;
    };
  }, []);

  const full = pin.length === 4;

  async function handleSave() {
    if (!full || saving) return;
    setSaving(true);
    await setProfile({ lockPin: pin, lockSkipped: false });
    await lock.refreshPin();
    await lock.markUnlocked();
    setPendingToast(enabled ? 'PIN updated' : 'Lock screen on');
    router.back();
  }

  async function handleTurnOff() {
    if (saving) return;
    setSaving(true);
    await setProfile({ lockPin: null, lockSkipped: true });
    await lock.refreshPin();
    setPendingToast('Lock screen off');
    router.back();
  }

  const subtitle = enabled
    ? 'Enter a new 4-digit PIN to change it, or turn off below.'
    : 'A short PIN keeps your chats and profile safe if someone picks up your phone.';

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
          center={{ kind: 'title', title: 'Lock screen' }}
          right={{ kind: 'spacer' }}
        />

        <View style={styles.body}>
          <View style={[styles.statusPill, { backgroundColor: colors.gray100 }]}>
            <Text style={[styles.statusText, { color: colors.textPrimary }]}>{enabled ? 'On' : 'Off'}</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

          <PinPad
            pin={pin}
            onPinChange={setPin}
            dotFilledColor={colors.textPrimary}
            dotEmptyBorderColor={Colors.gray60}
            keyTextColor={colors.textPrimary}
            keyPressedBg={colors.gray100}
            disabled={saving}
            centerDots
          />
        </View>

        <View
          style={[
            styles.dock,
            {
              paddingBottom: insets.bottom + Spacing.md,
              backgroundColor: colors.backgroundPrimary,
              borderTopColor: colors.gray100,
            },
          ]}
        >
          <PrimaryNextButton
            label={enabled ? 'Save new PIN' : 'Turn on'}
            inactive={!full || saving}
            onPress={handleSave}
          />
          {enabled ? (
            <HoldToConfirmButton
              label="Turn off"
              holdingLabel="Hold to turn off..."
              onConfirm={() => void handleTurnOff()}
              style={[styles.turnOffBtn, { backgroundColor: colors.backgroundPrimary }]}
              labelStyle={styles.turnOffText}
              fillColor={Colors.cherry}
              spinnerColor={Colors.cherry}
              activeLabelColor={Colors.white}
              activeSpinnerColor={Colors.white}
              accessibilityLabel="Hold to turn off lock screen"
            />
          ) : null}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  body: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    marginBottom: Spacing.sm,
  },
  statusText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.black,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.gray40,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  dock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray100,
  },
  turnOffBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.cherry,
  },
  turnOffText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    lineHeight: 20,
    letterSpacing: -0.32,
    color: Colors.cherry,
  },
});
