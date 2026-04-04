import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingHeader } from '@/components/onboarding/onboarding-header';
import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { IDENTITY_OPTIONS } from '@/constants/onboarding-options';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { hasSeenIntro } from '@/lib/intro-storage';

export default function OnboardingIdentitiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { identities, toggleIdentity } = useOnboarding();

  const canNext = identities.length > 0;

  async function finish() {
    if (!canNext) return;
    const seen = await hasSeenIntro();
    if (seen) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/onboarding/intro');
    }
  }

  return (
    <View style={styles.screen}>
      <OnboardingHeader step={7} />
      <View style={styles.headerText}>
        <Text style={styles.title}>Which identities match you?</Text>
        <Text style={styles.subtitle}>You can select multiple</Text>
      </View>
      <FlatList
        style={styles.list}
        data={[...IDENTITY_OPTIONS]}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => {
          const on = identities.includes(item);
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => toggleIdentity(item)}
            >
              <Text style={styles.rowLabel}>{item}</Text>
              <View style={[styles.checkOuter, on && styles.checkOuterOn]}>
                {on ? <Ionicons name="checkmark" size={18} color={Colors.white} /> : null}
              </View>
            </Pressable>
          );
        }}
      />
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <PrimaryNextButton disabled={!canNext} onPress={() => void finish()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerText: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
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
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray80,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
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
  checkOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.gray60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOuterOn: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray100,
  },
});
