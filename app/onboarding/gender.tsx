import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingHeader } from '@/components/onboarding/onboarding-header';
import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { GENDER_OPTIONS } from '@/constants/onboarding-options';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';

export default function OnboardingGenderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { genderId, setGenderId } = useOnboarding();

  function goNext() {
    if (!genderId) return;
    router.push('/onboarding/pronouns');
  }

  return (
    <View style={styles.screen}>
      <OnboardingHeader step={4} />
      <Text style={styles.title}>Select your gender</Text>
      <FlatList
        style={styles.list}
        data={GENDER_OPTIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => {
          const selected = genderId === item.id;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => setGenderId(item.id)}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowDesc}>{item.description}</Text>
              </View>
              <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                {selected ? (
                  <Ionicons name="checkmark" size={18} color={Colors.white} />
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <PrimaryNextButton disabled={!genderId} onPress={goNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.xxl,
    color: Colors.black,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray80,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  rowPressed: {
    opacity: 0.9,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.black,
    marginBottom: 4,
  },
  rowDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.gray40,
    lineHeight: 20,
  },
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
  radioOuterSelected: {
    borderColor: Colors.violet,
    backgroundColor: Colors.violet,
    shadowColor: Colors.aqua,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray100,
  },
});
