import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';

type Props = {
  step: number;
  total?: number;
  onBack?: () => void;
};

export function OnboardingHeader({ step, total = 7, onBack }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = step / total;

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </Pressable>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>
            {step}/{total}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: {
    opacity: 0.85,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.gray80,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.black,
    borderRadius: 2,
  },
  stepBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  stepText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.black,
  },
});
