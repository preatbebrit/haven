import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { GlowUnderline } from '@/components/onboarding/glow-underline';
import { useStepFlow } from '@/contexts/step-flow-context';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MOCK_TAKEN = new Set(['jane', 'test', 'admin', 'user', 'haven']);

export function StepUsername({ isActive }: { isActive: boolean }) {
  const { colors } = useTheme();
  const { setPrimaryButton, setSecondaryButton, setBackHandler, advance } = useStepFlow();
  const { username, setUsername } = useOnboarding();
  const [local, setLocal] = useState(username.replace(/^@/, ''));
  const [touched, setTouched] = useState(false);

  const trimmed = local.trim();
  const hasSpaces = /\s/.test(trimmed);
  const longEnough = trimmed.length >= 3;
  const taken = MOCK_TAKEN.has(trimmed.toLowerCase());
  const valid = longEnough && !hasSpaces && !taken;

  const showError = touched && trimmed.length > 0 && (!longEnough || hasSpaces || taken);

  const errorMessage = useMemo(() => {
    if (!showError) return '';
    if (hasSpaces) return 'No spaces allowed';
    if (!longEnough) return 'At least 3 characters';
    if (taken) return 'Username already taken';
    return '';
  }, [showError, hasSpaces, longEnough, taken]);

  useEffect(() => {
    if (!isActive) return;
    setPrimaryButton({
      label: 'Next',
      inactive: !valid,
      onPress: () => {
        if (!valid) return;
        setUsername(trimmed);
        advance();
      },
    });
    setSecondaryButton(null);
    setBackHandler(null);
  }, [isActive, valid, trimmed, setUsername, advance, setPrimaryButton, setSecondaryButton, setBackHandler]);

  return (
    <View style={styles.body}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Create a username</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>This is how everyone will see you</Text>

      <GlowUnderline variant={showError ? 'error' : 'default'} style={styles.inputWrap}>
        <View style={styles.prefixRow}>
          <Text style={[styles.at, { color: colors.textPrimary }]}>@</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            value={local}
            onChangeText={(t) => {
              setLocal(t.replace(/^@+/, ''));
              setTouched(true);
            }}
            placeholder="Username"
            placeholderTextColor={colors.gray80}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={32}
            accessibilityLabel="Username"
          />
        </View>
      </GlowUnderline>
      {showError ? <Text style={styles.error}>{errorMessage}</Text> : null}
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
  prefixRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  at: { fontFamily: FontFamily.semiBold, fontSize: 32, letterSpacing: -0.64, color: Colors.black },
  input: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 32,
    letterSpacing: -0.64,
    color: Colors.black,
    paddingVertical: Spacing.sm,
  },
  error: { marginTop: Spacing.sm, fontFamily: FontFamily.medium, fontSize: 16, color: '#d32f2f' },
});
