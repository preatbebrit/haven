import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlowUnderline } from '@/components/onboarding/glow-underline';
import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { AppHeader } from '@/components/ui/app-header';
import { CheckIcon } from '@/components/ui/icons/check-icon';
import { Toast } from '@/components/ui/toast';
import { PRONOUN_PRESETS } from '@/constants/onboarding-options';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useCurrentUser } from '@/contexts/current-user-context';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

// Hold the toast on-screen briefly before popping so the user sees the
// confirmation here instead of on /profile.
const SAVE_TOAST_HOLD_MS = 800;

export default function PronounsSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { session, updateProfilePrivate } = useAuth();
  const { currentUser } = useCurrentUser();

  const [preset, setPreset] = useState<string | null>(currentUser?.pronoun_preset ?? null);
  const [custom, setCustom] = useState<string>(currentUser?.pronouns_custom ?? '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const backTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (backTimerRef.current !== null) clearTimeout(backTimerRef.current);
    },
    [],
  );

  const customTrim = custom.trim();
  const hasSelection = Boolean(preset) || customTrim.length > 0;

  function selectPreset(p: string) {
    setPreset(p);
    setCustom('');
  }

  function onCustomChange(t: string) {
    setCustom(t);
    if (t.trim()) setPreset(null);
  }

  async function handleSave() {
    if (!hasSelection || saving || !session) return;
    setSaving(true);
    // Normalize empty string → null to match the convention in complete_onboarding
    // (nullif(..., '')) so the row reads consistently regardless of write path.
    const patch = {
      pronoun_preset: preset,
      pronouns_custom: customTrim.length === 0 ? null : custom,
    };
    const { error } = await supabase
      .from('profiles_private')
      .update(patch)
      .eq('id', session.user.id);
    if (error) {
      setSaving(false);
      Alert.alert("Couldn't save. Check your connection.");
      return;
    }
    updateProfilePrivate(patch);
    setToast('Saved');
    backTimerRef.current = setTimeout(() => router.back(), SAVE_TOAST_HOLD_MS);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Toast message={toast} onDismiss={() => setToast(null)} />
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: colors.backgroundPrimary }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AppHeader
          left={{
            kind: 'icon',
            icon: <Ionicons name="arrow-back" size={20} color={colors.textPrimaryInverted} />,
            onPress: () => router.back(),
            accessibilityLabel: 'Go back',
          }}
          center={{ kind: 'title', title: 'Pronouns' }}
          right={{ kind: 'spacer' }}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your pronouns are shown on your profile</Text>

          <View style={styles.list}>
            {PRONOUN_PRESETS.map((p) => {
              const selected = preset === p;
              return (
                <Pressable
                  key={p}
                  style={({ pressed }) => [
                    styles.row,
                    { borderBottomColor: colors.gray80 },
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => selectPreset(p)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{p}</Text>
                  <View
                    style={[
                      styles.radioOuter,
                      selected && { borderColor: colors.buttonPrimary, backgroundColor: colors.buttonPrimary },
                    ]}
                  >
                    {selected ? <CheckIcon size={16} color={colors.textPrimaryInverted} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.orOwn, { color: colors.textSecondary }]}>Or type in your own</Text>
          <GlowUnderline variant="default">
            <TextInput
              style={[styles.customInput, { color: colors.textPrimary }]}
              value={custom}
              onChangeText={onCustomChange}
              placeholder="e.g. xe/xem"
              placeholderTextColor={Colors.gray60}
              autoCapitalize="none"
              accessibilityLabel="Custom pronouns"
            />
          </GlowUnderline>
        </ScrollView>

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
            label="Save"
            inactive={!hasSelection || saving}
            onPress={handleSave}
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.gray40,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  list: { marginBottom: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray80,
  },
  rowPressed: { opacity: 0.6 },
  rowLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.black,
    flex: 1,
    paddingRight: Spacing.md,
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
  radioOuterSelected: { borderColor: Colors.black, backgroundColor: Colors.black },
  orOwn: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.gray40,
    marginBottom: Spacing.sm,
  },
  customInput: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.black,
    paddingVertical: Spacing.sm,
  },
  dock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray100,
  },
});
