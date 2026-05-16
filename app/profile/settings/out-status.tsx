import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { AppHeader } from '@/components/ui/app-header';
import { CheckIcon } from '@/components/ui/icons/check-icon';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import type { OutStatus } from '@/contexts/onboarding-context';
import { useTheme } from '@/hooks/use-theme';
import { setPendingToast } from '@/lib/pending-toast';
import { getProfile, setProfile } from '@/lib/profile-storage';

const OUT_OPTIONS: { id: OutStatus; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'sort-of', label: 'Sort of' },
];

export default function OutStatusSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [outStatus, setOutStatus] = useState<OutStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [initial, setInitial] = useState<OutStatus | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    getProfile().then((p) => {
      if (!alive) return;
      setOutStatus(p.outStatus);
      setInitial(p.outStatus);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const hasChange = loaded && outStatus !== initial;

  async function handleSave() {
    if (!hasChange || saving) return;
    setSaving(true);
    await setProfile({ outStatus });
    setPendingToast('Saved');
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
          center={{ kind: 'title', title: 'Out status' }}
          right={{ kind: 'spacer' }}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Out — recognizing, accepting, and openly sharing one&apos;s LGBTQ+ orientation or
            gender identity with others.
          </Text>
          <View style={styles.list}>
            {OUT_OPTIONS.map(({ id, label }) => {
              const selected = outStatus === id;
              return (
                <Pressable
                  key={id}
                  style={({ pressed }) => [
                    styles.row,
                    { borderBottomColor: colors.gray80 },
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => setOutStatus(id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
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
            inactive={!hasChange || saving}
            onPress={handleSave}
          />
        </View>
      </View>
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
  list: {},
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
  dock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray100,
  },
});
