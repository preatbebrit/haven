import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlowUnderline } from '@/components/onboarding/glow-underline';
import { OnboardingHeader } from '@/components/onboarding/onboarding-header';
import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';

const MOCK_TAKEN = new Set(['jane', 'test', 'admin', 'user', 'haven']);

export default function OnboardingUsernameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  function goNext() {
    if (!valid) return;
    setUsername(trimmed);
    router.push('/onboarding/age');
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <OnboardingHeader step={1} />
      <View style={styles.body}>
        <Text style={styles.title}>Create a username</Text>
        <Text style={styles.subtitle}>This is how everyone will see you</Text>

        <GlowUnderline variant={showError || taken ? 'error' : 'default'} style={styles.inputWrap}>
          <View style={styles.prefixRow}>
            <Text style={styles.at}>@</Text>
            <TextInput
              style={styles.input}
              value={local}
              onChangeText={(t) => {
                setLocal(t.replace(/^@+/, ''));
                setTouched(true);
              }}
              placeholder="Username"
              placeholderTextColor={Colors.gray60}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={32}
              accessibilityLabel="Username"
            />
          </View>
        </GlowUnderline>
        {showError ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <PrimaryNextButton disabled={!valid} onPress={goNext} />
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
    marginBottom: Spacing.xl,
  },
  inputWrap: {
    marginTop: Spacing.sm,
  },
  prefixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  at: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.black,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
    color: Colors.black,
    paddingVertical: Spacing.sm,
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
