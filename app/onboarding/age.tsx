import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlowUnderline } from '@/components/onboarding/glow-underline';
import { OnboardingHeader } from '@/components/onboarding/onboarding-header';
import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { formatMMDDYYYY, isAtLeast18, parseUSDate } from '@/lib/date-input';

export default function OnboardingAgeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  function goNext() {
    if (!complete || !oldEnough) return;
    setDateOfBirth(value);
    router.push('/onboarding/lock');
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
    >
      <OnboardingHeader step={2} />
      <View style={styles.body}>
        <Text style={styles.title}>When were you born?</Text>
        <Text style={styles.subtitle}>MM/DD/YYYY</Text>

        <GlowUnderline variant={showInvalidAge ? 'error' : 'default'} style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder="MM/DD/YYYY"
            placeholderTextColor={Colors.gray60}
            keyboardType="number-pad"
            maxLength={10}
            accessibilityLabel="Date of birth"
          />
        </GlowUnderline>
        {showInvalidAge ? <Text style={styles.error}>Invalid Age</Text> : null}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <PrimaryNextButton disabled={!oldEnough} onPress={goNext} />
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
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.xxl,
    color: Colors.black,
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.gray40,
    marginBottom: Spacing.xl,
  },
  inputWrap: {
    marginTop: Spacing.sm,
  },
  input: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xl,
    color: Colors.black,
    paddingVertical: Spacing.sm,
    letterSpacing: 1,
  },
  error: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: '#d32f2f',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray100,
  },
});
