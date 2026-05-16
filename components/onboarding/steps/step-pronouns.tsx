import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GlowUnderline } from '@/components/onboarding/glow-underline';
import { CheckIcon } from '@/components/ui/icons/check-icon';
import { useStepFlow } from '@/contexts/step-flow-context';
import { PRONOUN_PRESETS } from '@/constants/onboarding-options';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function StepPronouns({ isActive }: { isActive: boolean }) {
  const { colors } = useTheme();
  const { setPrimaryButton, setSecondaryButton, setBackHandler, advance } = useStepFlow();
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

  useEffect(() => {
    if (!isActive) return;
    setPrimaryButton({
      label: 'Next',
      inactive: !hasSelection,
      onPress: () => {
        if (!hasSelection) return;
        advance();
      },
    });
    setSecondaryButton(null);
    setBackHandler(null);
  }, [isActive, hasSelection, advance, setPrimaryButton, setSecondaryButton, setBackHandler]);

  return (
    <View style={styles.body}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>What are your pronouns</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your pronouns are shown on your profile</Text>

      <View style={styles.list}>
        {PRONOUN_PRESETS.map((p) => {
          const selected = pronounPreset === p;
          return (
            <Pressable
              key={p}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: colors.gray80 },
                pressed && styles.rowPressed,
              ]}
              onPress={() => selectPreset(p)}
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
          value={pronounsCustom}
          onChangeText={onCustomChange}
          placeholder="e.g. xe/xem"
          placeholderTextColor={Colors.gray60}
          autoCapitalize="none"
          accessibilityLabel="Custom pronouns"
        />
      </GlowUnderline>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
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
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray80,
  },
  rowPressed: { opacity: 0.9 },
  rowLabel: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.black },
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
});
