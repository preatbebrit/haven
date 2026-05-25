import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ResourcesList } from '@/components/resources/resources-list';
import { CheckIcon } from '@/components/ui/icons/check-icon';
import { useStepFlow } from '@/contexts/step-flow-context';
import { ACCEPTING_ENVIRONMENT_OPTIONS } from '@/constants/onboarding-options';
import { ACCEPTING_ENVIRONMENT_CONCERNING } from '@/constants/resources';
import { useOnboarding } from '@/contexts/onboarding-context';
import { type OutStatus } from '@/lib/profile-display';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Phase = 'out' | 'environment' | 'resources';

const OUT_OPTIONS: { id: OutStatus; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'sort-of', label: 'Sort-of' },
];

export function StepOutStatus({ isActive }: { isActive: boolean }) {
  const { colors } = useTheme();
  const { setPrimaryButton, setSecondaryButton, setBackHandler, advance } = useStepFlow();
  const { outStatus, setOutStatus, acceptingEnvironment, setAcceptingEnvironment } = useOnboarding();
  const [phase, setPhase] = useState<Phase>('out');

  useEffect(() => {
    if (!isActive) return;

    if (phase === 'resources') {
      setPrimaryButton({
        label: 'Next',
        inactive: false,
        onPress: () => advance(),
      });
      setSecondaryButton(null);
      setBackHandler(() => setPhase('environment'));
      return;
    }

    if (phase === 'environment') {
      setPrimaryButton({
        label: 'Next',
        inactive: !acceptingEnvironment,
        onPress: () => {
          if (!acceptingEnvironment) return;
          if (ACCEPTING_ENVIRONMENT_CONCERNING.has(acceptingEnvironment)) {
            setPhase('resources');
            return;
          }
          advance();
        },
      });
      setSecondaryButton(null);
      setBackHandler(() => setPhase('out'));
      return;
    }

    setPrimaryButton({
      label: 'Next',
      inactive: outStatus === null,
      onPress: () => {
        if (outStatus === null) return;
        setPhase('environment');
      },
    });
    setSecondaryButton(null);
    setBackHandler(null);
  }, [
    isActive,
    phase,
    outStatus,
    acceptingEnvironment,
    advance,
    setAcceptingEnvironment,
    setPrimaryButton,
    setSecondaryButton,
    setBackHandler,
  ]);

  const rowStyleFor = (selected: boolean) =>
    [
      styles.row,
      { borderBottomColor: colors.gray80 },
    ] as const;
  const radioStyleFor = (selected: boolean) =>
    [
      styles.radioOuter,
      selected && { borderColor: colors.buttonPrimary, backgroundColor: colors.buttonPrimary },
    ];

  if (phase === 'resources') {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>Resources</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Before moving forward, check out the resources available to find help.
        </Text>
        <ResourcesList style={styles.resourcesList} />
      </ScrollView>
    );
  }

  if (phase === 'environment') {
    return (
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Are you in an accepting environment?</Text>
        <View style={styles.list}>
          {ACCEPTING_ENVIRONMENT_OPTIONS.map((label) => {
            const selected = acceptingEnvironment === label;
            return (
              <Pressable
                key={label}
                style={({ pressed }) => [...rowStyleFor(selected), pressed && styles.rowPressed]}
                onPress={() => setAcceptingEnvironment(label)}
              >
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
                <View style={radioStyleFor(selected)}>
                  {selected ? <CheckIcon size={16} color={colors.textPrimaryInverted} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Are you out?</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Out — recognizing, accepting, and openly sharing one&apos;s LGBTQ+ orientation or gender
        identity with others.
      </Text>
      <View style={styles.list}>
        {OUT_OPTIONS.map(({ id, label }) => {
          const selected = outStatus === id;
          return (
            <Pressable
              key={id}
              style={({ pressed }) => [...rowStyleFor(selected), pressed && styles.rowPressed]}
              onPress={() => setOutStatus(id)}
            >
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
              <View style={radioStyleFor(selected)}>
                {selected ? <CheckIcon size={16} color={colors.textPrimaryInverted} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
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
    lineHeight: 20,
    letterSpacing: -0.32,
    marginBottom: Spacing.lg,
  },
  resourcesList: { marginTop: Spacing.xs },
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
  radioOuterSelected: { borderColor: Colors.black, backgroundColor: Colors.black },
});
