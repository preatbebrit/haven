import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlowUnderline } from '@/components/onboarding/glow-underline';
import { OnboardingHeader } from '@/components/onboarding/onboarding-header';
import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { PRONOUN_PRESETS } from '@/constants/onboarding-options';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';

export default function OnboardingPronounsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pronounPreset, setPronounPreset, pronounsCustom, setPronounsCustom } = useOnboarding();
  const customTrim = pronounsCustom.trim();
  const hasSelection = Boolean(pronounPreset) || customTrim.length > 0;

  function selectPreset(p: string) {
    setPronounPreset(p);
    setPronounsCustom('');
  }

  function onCustomChange(t: string) {
    setPronounsCustom(t);
    if (t.trim()) setPronounPreset(null);
  }

  function goNext() {
    if (!hasSelection) return;
    router.push('/onboarding/out-status');
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
    >
      <OnboardingHeader step={5} />
      <View style={styles.body}>
        <Text style={styles.title}>What are your pronouns</Text>
        <Text style={styles.subtitle}>Your pronouns are shown on your profile</Text>

        <View style={styles.list}>
          {PRONOUN_PRESETS.map((p) => {
            const selected = pronounPreset === p;
            return (
              <Pressable
                key={p}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => selectPreset(p)}
              >
                <Text style={styles.rowLabel}>{p}</Text>
                <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                  {selected ? <Ionicons name="checkmark" size={16} color={Colors.white} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.orOwn}>Or type in your own</Text>
        <GlowUnderline variant="default">
          <TextInput
            style={styles.customInput}
            value={pronounsCustom}
            onChangeText={onCustomChange}
            placeholder="e.g. xe/xem"
            placeholderTextColor={Colors.gray60}
            autoCapitalize="none"
            accessibilityLabel="Custom pronouns"
          />
        </GlowUnderline>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <PrimaryNextButton disabled={!hasSelection} onPress={goNext} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h1,
    lineHeight: 44,
    letterSpacing: -2.4,
    color: Colors.black,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.gray40,
    marginBottom: Spacing.lg,
  },
  list: {
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray80,
  },
  rowPressed: {
    opacity: 0.9,
  },
  rowLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.black,
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
  radioOuterSelected: {
    borderColor: Colors.black,
    backgroundColor: Colors.black,
  },
  orOwn: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.gray40,
    textAlign: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  customInput: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
    color: Colors.black,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray100,
  },
});
