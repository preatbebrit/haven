import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon } from '@/components/ui/icons/check-icon';
import { useStepFlow } from '@/contexts/step-flow-context';
import { GENDER_OPTIONS } from '@/constants/onboarding-options';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function StepGender({ isActive }: { isActive: boolean }) {
  const { colors } = useTheme();
  const { setPrimaryButton, setSecondaryButton, setBackHandler, advance } = useStepFlow();
  const { genderId, setGenderId } = useOnboarding();

  useEffect(() => {
    if (!isActive) return;
    setPrimaryButton({
      label: 'Next',
      inactive: !genderId,
      onPress: () => {
        if (!genderId) return;
        advance();
      },
    });
    setSecondaryButton(null);
    setBackHandler(null);
  }, [isActive, genderId, advance, setPrimaryButton, setSecondaryButton, setBackHandler]);

  return (
    <View style={styles.body}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Select your gender</Text>
      <FlatList
        style={styles.list}
        data={GENDER_OPTIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => (
          <View style={[styles.sep, { backgroundColor: colors.gray80 }]} />
        )}
        renderItem={({ item }) => {
          const selected = genderId === item.id;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => setGenderId(item.id)}
            >
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{item.description}</Text>
              </View>
              <View
                style={[
                  styles.radioOuter,
                  selected && { borderColor: colors.buttonPrimary, backgroundColor: colors.buttonPrimary },
                ]}
              >
                {selected ? <CheckIcon size={18} color={colors.textPrimaryInverted} /> : null}
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
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h1,
    lineHeight: 44,
    letterSpacing: -2.4,
    color: Colors.black,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.gray80 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: Spacing.md, gap: Spacing.md },
  rowPressed: { opacity: 0.9 },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.black, marginBottom: 4 },
  rowDesc: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: Colors.gray40, lineHeight: 20 },
  radioOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.gray60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioOuterSelected: { borderColor: Colors.black, backgroundColor: Colors.black },
});
