import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { GlowUnderline } from '@/components/onboarding/glow-underline';
import { useStepFlow } from '@/contexts/step-flow-context';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

// Mirrors the server-side regex in the complete_onboarding RPC and the CHECK
// constraint on profiles_public.username. Keep these two in sync — see
// supabase/migrations/20260521120000_profile_phase1.sql.
const USERNAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9._-]{2,13}[A-Za-z0-9]$/;

// 400 ms hits the GitHub/Discord sweet spot: long enough that mid-word typing
// doesn't fire requests, short enough that a paused user gets feedback before
// reaching for the Next button.
const AVAILABILITY_DEBOUNCE_MS = 400;

type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken';

export function StepUsername({ isActive }: { isActive: boolean }) {
  const { colors } = useTheme();
  const { setPrimaryButton, setSecondaryButton, setBackHandler, advance } = useStepFlow();
  const { username, setUsername } = useOnboarding();
  const [local, setLocal] = useState(username.replace(/^@/, ''));

  // One-way sync: when context becomes populated (e.g., hydrated from
  // server-side draft on resume) but local state is still empty, seed
  // local from context. After this initial seed, local owns the value;
  // context picks it up on advance via saveStepDraft.
  useEffect(() => {
    if (local === '' && username !== '') {
      setLocal(username.replace(/^@/, ''));
    }
  }, [username, local]);
  // Initialized to an empty Set so `.has()` is a silent no-op until the
  // reserved_usernames fetch completes. Don't "fix" this by gating submit
  // on the fetch — server-side validation in complete_onboarding catches
  // anything that slips through, and the fallback is intentional.
  const [reservedSet, setReservedSet] = useState<Set<string>>(() => new Set());
  const [availabilityStatus, setAvailabilityStatus] =
    useState<AvailabilityStatus>('idle');

  useEffect(() => {
    let alive = true;
    void supabase
      .from('reserved_usernames')
      .select('word')
      .then(({ data, error }) => {
        if (!alive) return;
        if (error || !data) return; // Fall back to length+format-only validation.
        setReservedSet(new Set(data.map((r) => (r as { word: string }).word)));
      });
    return () => {
      alive = false;
    };
  }, []);

  const trimmed = local.trim();

  // Validation hierarchy from §11.9 of the plan. Returns the user-facing
  // message for the first failing rule, or null for valid. The 'taken' branch
  // is layered on top of this via availabilityStatus — kept out of the
  // memoized hierarchy because it changes async and would re-trigger the
  // debounced effect's deps if folded in.
  const validationError = useMemo<string | null>(() => {
    if (trimmed.length === 0) return 'Pick a username to continue';
    if (trimmed.length < 4) return 'Use 4–15 characters';
    if (trimmed.length > 15) return 'Use 4–15 characters';
    if (!USERNAME_REGEX.test(trimmed)) {
      return 'Use letters, numbers, ., _, or -. Start and end with a letter or number.';
    }
    if (reservedSet.has(trimmed.toLowerCase())) {
      return 'That username is reserved. Try another.';
    }
    return null;
  }, [trimmed, reservedSet]);

  // Debounced availability probe. The server-side unique index in
  // complete_onboarding remains the authority for the race case (two users
  // submitting the same name concurrently) — this just catches the common
  // case so the user doesn't walk through 5 more steps before learning.
  //
  // Cancellation strategy: a closure-scoped `cancelled` flag plus clearTimeout
  // in the cleanup. Each effect run has its own closure, so a stale in-flight
  // fetch from a previous keystroke can't write to state after a newer effect
  // runs.
  useEffect(() => {
    if (validationError !== null) {
      setAvailabilityStatus('idle');
      return;
    }

    // Reset to idle synchronously so a stale 'taken' from the previous value
    // doesn't render against the new (not-yet-checked) input during the
    // 400 ms debounce window.
    setAvailabilityStatus('idle');

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setAvailabilityStatus('checking');

      // The functional unique index on profiles_public.username uses
      // lower(username), so we have to match case-insensitively. Naive
      // .ilike(value) is wrong here: the regex permits '_' and the SQL LIKE
      // family treats '_' as a single-char wildcard, so 'john_doe' would
      // falsely match 'johnXdoe'. Escape '_', '%', and '\' so the pattern
      // matches literally under default ESCAPE '\'.
      const pattern = trimmed.replace(/[\\%_]/g, '\\$&');

      const { data, error } = await supabase
        .from('profiles_public')
        .select('id')
        .ilike('username', pattern)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        // Network down / RLS reject / etc. Don't block submit on a failed
        // check — the server-side unique index at submit time is the
        // authority. Reset to idle so the Next button stays inactive (the
        // conservative path) and we don't show a misleading error message.
        setAvailabilityStatus('idle');
        return;
      }
      setAvailabilityStatus(data ? 'taken' : 'available');
    }, AVAILABILITY_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, validationError]);

  const previewValid = validationError === null;
  // Conservative path: Next is only active once we've confirmed availability.
  // 'idle' and 'checking' both keep it inactive, even for preview-valid input.
  const valid = previewValid && availabilityStatus === 'available';
  const isEmpty = trimmed.length === 0;
  const showTaken = previewValid && availabilityStatus === 'taken';
  const showChecking = previewValid && availabilityStatus === 'checking';

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

  // Hint precedence: preview error > taken > checking > none. The 'checking'
  // line is a neutral status — not an error — so it doesn't flicker red on
  // every keystroke.
  let hint: { text: string; tone: 'error' | 'neutral' } | null = null;
  if (validationError !== null && !isEmpty) {
    hint = { text: validationError, tone: 'error' };
  } else if (showTaken) {
    hint = { text: 'That username is taken. Try another.', tone: 'error' };
  } else if (showChecking) {
    hint = { text: 'Checking…', tone: 'neutral' };
  }

  const hasErrorVariant = (!isEmpty && validationError !== null) || showTaken;

  return (
    <View style={styles.body}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Create a username</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>This is how everyone will see you</Text>

      <GlowUnderline variant={hasErrorVariant ? 'error' : 'default'} style={styles.inputWrap}>
        <View style={styles.prefixRow}>
          <Text style={[styles.at, { color: colors.textPrimary }]}>@</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={local}
              onChangeText={(t) => setLocal(t.replace(/^@+/, ''))}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={32}
              accessibilityLabel="Username"
            />
            {local.length === 0 ? (
              <View pointerEvents="none" style={styles.placeholderOverlay}>
                <Text style={[styles.placeholderText, { color: colors.gray80 }]}>
                  Username
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </GlowUnderline>
      {hint ? (
        <Text
          style={[
            styles.hint,
            { color: hint.tone === 'error' ? '#d32f2f' : colors.textSecondary },
          ]}
        >
          {hint.text}
        </Text>
      ) : null}
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
  at: { fontFamily: FontFamily.semiBold, fontSize: 32, lineHeight: 40, letterSpacing: -0.64, color: Colors.black },
  inputBox: { flex: 1, height: 56, justifyContent: 'center' },
  input: {
    height: 56,
    fontFamily: FontFamily.semiBold,
    fontSize: 32,
    letterSpacing: -0.64,
    color: Colors.black,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  placeholderOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 32,
    letterSpacing: -0.64,
  },
  hint: { marginTop: Spacing.sm, fontFamily: FontFamily.medium, fontSize: 16 },
});
