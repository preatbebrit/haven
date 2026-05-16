import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon } from '@/components/ui/icons/check-icon';
import { useStepFlow } from '@/contexts/step-flow-context';
import { IDENTITY_OPTIONS } from '@/constants/onboarding-options';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function StepIdentities({ isActive }: { isActive: boolean }) {
  const { colors } = useTheme();
  const { setPrimaryButton, setSecondaryButton, setBackHandler, finish } = useStepFlow();
  const { identities, toggleIdentity } = useOnboarding();

  const canNext = identities.length > 0;

  useEffect(() => {
    if (!isActive) return;
    setPrimaryButton({
      label: 'Next',
      inactive: !canNext,
      onPress: () => {
        if (!canNext) return;
        finish();
      },
    });
    setSecondaryButton(null);
    setBackHandler(null);
  }, [isActive, canNext, finish, setPrimaryButton, setSecondaryButton, setBackHandler]);

  return (
    <View style={styles.body}>
      <View style={styles.headerText}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Which identities match you?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>You can select multiple</Text>
      </View>
      <FlatList
        style={styles.list}
        data={[...IDENTITY_OPTIONS]}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => (
          <View style={[styles.sep, { backgroundColor: colors.gray80 }]} />
        )}
        renderItem={({ item }) => {
          const on = identities.includes(item);
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => toggleIdentity(item)}
            >
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{item}</Text>
              <View
                style={[
                  styles.checkOuter,
                  on && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
                ]}
              >
                {on ? <CheckIcon size={18} color={colors.textPrimaryInverted} /> : null}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  headerText: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h1,
    lineHeight: 44,
    letterSpacing: -2.4,
    color: Colors.black,
    marginBottom: Spacing.sm,
  },
  subtitle: { fontFamily: FontFamily.medium, fontSize: FontSize.md, color: Colors.gray40 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.gray80 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  rowPressed: { opacity: 0.9 },
  rowLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.black,
    flex: 1,
    paddingRight: Spacing.md,
  },
  checkOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.gray60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOuterOn: { backgroundColor: Colors.black, borderColor: Colors.black },
});
