import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { AppHeader } from '@/components/ui/app-header';
import { CheckIcon } from '@/components/ui/icons/check-icon';
import { Toast } from '@/components/ui/toast';
import { IDENTITY_OPTIONS } from '@/constants/onboarding-options';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useCurrentUser } from '@/contexts/current-user-context';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

// Hold the toast on-screen briefly before popping so the user sees the
// confirmation here instead of on /profile.
const SAVE_TOAST_HOLD_MS = 800;

export default function IdentitySettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { session, updateProfilePrivate } = useAuth();
  const { currentUser } = useCurrentUser();

  const initial = useMemo(
    () => new Set(currentUser?.identity_tags ?? []),
    [currentUser?.identity_tags],
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial));
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const backTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (backTimerRef.current !== null) clearTimeout(backTimerRef.current);
    },
    [],
  );

  function toggle(item: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  const hasChange = useMemo(() => {
    if (selected.size !== initial.size) return true;
    for (const id of selected) if (!initial.has(id)) return true;
    return false;
  }, [selected, initial]);

  async function handleSave() {
    if (!hasChange || saving || !session) return;
    setSaving(true);
    const patch = { identity_tags: Array.from(selected) };
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
      <View style={[styles.screen, { backgroundColor: colors.backgroundPrimary }]}>
        <AppHeader
          left={{
            kind: 'icon',
            icon: <Ionicons name="arrow-back" size={20} color={colors.textPrimaryInverted} />,
            onPress: () => router.back(),
            accessibilityLabel: 'Go back',
          }}
          center={{ kind: 'title', title: 'Identity' }}
          right={{ kind: 'spacer' }}
        />

        <View style={styles.headerText}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>You can select multiple</Text>
        </View>

        <FlatList
          style={styles.list}
          data={[...IDENTITY_OPTIONS]}
          keyExtractor={(item) => item}
          contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: colors.gray80 }]} />
          )}
          renderItem={({ item }) => {
            const on = selected.has(item);
            return (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => toggle(item)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
              >
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{item}</Text>
                <View
                  style={[
                    styles.checkOuter,
                    on && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
                  ]}
                >
                  {on ? <CheckIcon size={18} color={colors.textPrimaryInverted} /> : null}
                </View>
              </Pressable>
            );
          }}
        />

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
  headerText: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  subtitle: { fontFamily: FontFamily.medium, fontSize: FontSize.md, color: Colors.gray40 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.gray80 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  rowPressed: { opacity: 0.6 },
  rowLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.black,
    flex: 1,
    paddingRight: Spacing.md,
  },
  checkOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.gray60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOuterOn: { backgroundColor: Colors.black, borderColor: Colors.black },
  dock: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray100,
  },
});
