import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { GlowUnderline } from '@/components/onboarding/glow-underline';
import { useStepFlow } from '@/contexts/step-flow-context';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMMDDYYYY, isAtLeast18, parseUSDate } from '@/lib/date-input';

export function StepAge({ isActive }: { isActive: boolean }) {
  const { colors } = useTheme();
  const { setPrimaryButton, setSecondaryButton, setBackHandler, advance } = useStepFlow();
  const { dateOfBirth, setDateOfBirth } = useOnboarding();
  const [value, setValue] = useState(dateOfBirth);
  const [touched, setTouched] = useState(false);

  const complete = value.length === 10;
  const parsed = complete ? parseUSDate(value) : null;
  const validDate = parsed !== null;
  const oldEnough = complete && validDate && isAtLeast18(value);
  const showInvalidAge = touched && complete && (!validDate || !oldEnough);

  function onChangeText(t: string) {
    const digits = t.replace(/\D/g, '').slice(0, 8);
    setValue(formatMMDDYYYY(digits));
    setTouched(true);
  }

  useEffect(() => {
    if (!isActive) return;
    setPrimaryButton({
      label: 'Next',
      inactive: !oldEnough,
      onPress: () => {
        if (!oldEnough) return;
        setDateOfBirth(value);
        advance();
      },
    });
    setSecondaryButton(null);
    setBackHandler(null);
  }, [isActive, oldEnough, value, setDateOfBirth, advance, setPrimaryButton, setSecondaryButton, setBackHandler]);

  return (
    <View style={styles.body}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>When were you born?</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>MM/DD/YYYY</Text>

      <GlowUnderline variant={showInvalidAge ? 'error' : 'default'} style={styles.inputWrap}>
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          value={value}
          onChangeText={onChangeText}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={colors.gray80}
          keyboardType="number-pad"
          maxLength={10}
          accessibilityLabel="Date of birth"
        />
      </GlowUnderline>
      {showInvalidAge ? <Text style={styles.error}>Invalid Age</Text> : null}
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
    letterSpacing: -0.32,
    color: Colors.gray40,
    marginBottom: Spacing.xl,
  },
  inputWrap: { marginTop: Spacing.sm },
  input: {
    fontFamily: FontFamily.semiBold,
    fontSize: 32,
    letterSpacing: -0.64,
    color: Colors.black,
    paddingVertical: Spacing.sm,
  },
  error: { marginTop: Spacing.sm, fontFamily: FontFamily.medium, fontSize: 16, color: '#d32f2f' },
});
