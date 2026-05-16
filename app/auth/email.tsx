import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SUPABASE_CONFIGURED, supabase } from '@/lib/supabase';

type Mode = 'sign-in' | 'sign-up';

const MIN_PASSWORD_LENGTH = 8;

export default function AuthEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [mode, setMode] = useState<Mode>('sign-up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedEmail = email.trim();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const passwordLongEnough = password.length >= MIN_PASSWORD_LENGTH;
  const confirmMatches = mode === 'sign-in' || confirm === password;
  const canSubmit =
    emailLooksValid && passwordLongEnough && confirmMatches && !submitting;

  function toggleMode() {
    setMode((m) => (m === 'sign-up' ? 'sign-in' : 'sign-up'));
    setError(null);
    setConfirm('');
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    if (!SUPABASE_CONFIGURED) {
      setError('Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env and restart Expo.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { error: authError } =
        mode === 'sign-up'
          ? await supabase.auth.signUp({ email: trimmedEmail, password })
          : await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      if (authError) {
        setError(authError.message);
        return;
      }
      // AuthProvider's onAuthStateChange listener routes us via app/index.tsx gating.
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = mode === 'sign-up' ? 'Create account' : 'Sign in';
  const toggleLabel =
    mode === 'sign-up' ? 'Already have an account? Sign in' : "Don't have an account? Sign up";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: colors.backgroundPrimary }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {mode === 'sign-up' ? 'Create your\naccount' : 'Welcome\nback'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {mode === 'sign-up'
              ? 'Use an email you check — we send safety updates here.'
              : 'Sign in with the email and password you used to sign up.'}
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray100 }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.gray80}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              textContentType="emailAddress"
              accessibilityLabel="Email"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray100 }]}
              value={password}
              onChangeText={setPassword}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              placeholderTextColor={colors.gray80}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              textContentType={mode === 'sign-up' ? 'newPassword' : 'password'}
              accessibilityLabel="Password"
            />
          </View>

          {mode === 'sign-up' ? (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm password</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.gray100 }]}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Re-enter password"
                placeholderTextColor={colors.gray80}
                secureTextEntry
                autoCapitalize="none"
                accessibilityLabel="Confirm password"
              />
              {confirm.length > 0 && !confirmMatches ? (
                <Text style={styles.error}>Passwords don&apos;t match</Text>
              ) : null}
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
          <PressableScale
            style={[
              styles.submit,
              { backgroundColor: colors.buttonPrimary },
              !canSubmit && styles.submitDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={submitLabel}
          >
            {submitting ? (
              <ActivityIndicator color={colors.textPrimaryInverted} />
            ) : (
              <Text style={[styles.submitLabel, { color: colors.textPrimaryInverted }]}>
                {submitLabel}
              </Text>
            )}
          </PressableScale>
          <Pressable onPress={toggleMode} style={styles.toggleBtn} accessibilityRole="button">
            <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{toggleLabel}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h1,
    lineHeight: 44,
    letterSpacing: -2.4,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: 20,
    letterSpacing: -0.32,
    marginBottom: Spacing.xl,
  },
  field: { marginBottom: Spacing.md },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    lineHeight: 16,
    marginBottom: Spacing.xs,
  },
  input: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    borderWidth: 1,
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
    gap: Spacing.sm,
  },
  submit: {
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.4 },
  submitLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    lineHeight: 20,
    letterSpacing: -0.32,
    color: Colors.white,
  },
  toggleBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  toggleLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});
