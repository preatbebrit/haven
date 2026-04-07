import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingHeader } from '@/components/onboarding/onboarding-header';
import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { ACCEPTING_ENVIRONMENT_OPTIONS } from '@/constants/onboarding-options';
import { useOnboarding, type OutStatus } from '@/contexts/onboarding-context';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';

type Phase = 'out' | 'environment';

const OUT_OPTIONS: { id: OutStatus; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'sort-of', label: 'Sort-of' },
];

export default function OnboardingOutStatusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { outStatus, setOutStatus, acceptingEnvironment, setAcceptingEnvironment } =
    useOnboarding();
  const [phase, setPhase] = useState<Phase>('out');

  const handleBack = useCallback(() => {
    if (phase === 'environment') {
      setPhase('out');
      setAcceptingEnvironment(null);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/onboarding/pronouns');
  }, [phase, router, setAcceptingEnvironment]);

  function handleOutNext() {
    if (outStatus === null) return;
    if (outStatus === 'no') {
      setPhase('environment');
      return;
    }
    router.push('/onboarding/identities');
  }

  function handleEnvNext() {
    if (!acceptingEnvironment) return;
    router.push('/onboarding/identities');
  }

  if (phase === 'environment') {
    return (
      <View style={styles.screen}>
        <OnboardingHeader step={6} onBack={handleBack} />
        <View style={styles.body}>
          <Text style={styles.title}>Are you in an accepting environment?</Text>
          <View style={styles.list}>
            {ACCEPTING_ENVIRONMENT_OPTIONS.map((label) => {
              const selected = acceptingEnvironment === label;
              return (
                <Pressable
                  key={label}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => setAcceptingEnvironment(label)}
                >
                  <Text style={styles.rowLabel}>{label}</Text>
                  <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                    {selected ? <Ionicons name="checkmark" size={16} color={Colors.white} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <PrimaryNextButton disabled={!acceptingEnvironment} onPress={handleEnvNext} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <OnboardingHeader step={6} onBack={handleBack} />
      <View style={styles.body}>
        <Text style={styles.title}>Are you out?</Text>
        <Text style={styles.subtitle}>
          Out — recognizing, accepting, and openly sharing one&apos;s LGBTQ+ orientation or gender
          identity with others.
        </Text>
        <View style={styles.list}>
          {OUT_OPTIONS.map(({ id, label }) => {
            const selected = outStatus === id;
            return (
              <Pressable
                key={id}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => setOutStatus(id)}
              >
                <Text style={styles.rowLabel}>{label}</Text>
                <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                  {selected ? <Ionicons name="checkmark" size={16} color={Colors.white} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <PrimaryNextButton disabled={outStatus === null} onPress={handleOutNext} />
      </View>
    </View>
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
    fontSize: FontSize.sm,
    color: Colors.gray40,
    lineHeight: 22,
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
  radioOuterSelected: {
    borderColor: Colors.black,
    backgroundColor: Colors.black,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray100,
  },
});
