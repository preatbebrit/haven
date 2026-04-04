import { useHeaderHeight } from '@react-navigation/elements';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MOCK_GROUP_CARDS } from '@/constants/mock-groups';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { setPendingPromptShare } from '@/lib/pending-share';

const MAX_CHARS = 300;
const PURPLE = '#3d0f7a';

export default function PromptScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [answer, setAnswer] = useState('');

  const group = useMemo(
    () => MOCK_GROUP_CARDS.find((g) => g.id === id) ?? MOCK_GROUP_CARDS[0],
    [id],
  );

  const length = answer.length;
  const canShare = length > 0 && length <= MAX_CHARS;

  function handleShare() {
    if (!canShare) return;
    setPendingPromptShare(group.id, answer.trim());
    router.replace({ pathname: '/answers', params: { groupId: group.id } });
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerStyle: { backgroundColor: PURPLE },
          headerTintColor: Colors.white,
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        <View style={styles.screen}>
          <StatusBar style="light" />

          <View style={styles.topRow}>
            <Text style={styles.promptLabel}>Prompt</Text>
            <Text style={styles.counter}>
              {length}/{MAX_CHARS}
            </Text>
          </View>

          <Text style={styles.question}>{group.question}</Text>

          <TextInput
            style={styles.input}
            value={answer}
            onChangeText={(t) => setAnswer(t.slice(0, MAX_CHARS))}
            placeholder="Share honestly — this is your space."
            placeholderTextColor="rgba(255,255,255,0.45)"
            multiline
            textAlignVertical="top"
            maxLength={MAX_CHARS}
            autoCorrect
            accessibilityLabel="Your answer to the prompt"
          />
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <Pressable
            style={({ pressed }) => [
              styles.shareButton,
              !canShare && styles.shareButtonDisabled,
              pressed && canShare && styles.shareButtonPressed,
            ]}
            onPress={handleShare}
            disabled={!canShare}
            accessibilityRole="button"
            accessibilityLabel="Share with chat"
          >
            <Text style={styles.shareLabel}>Share with chat</Text>
            <Text style={styles.shareArrow}>→</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: PURPLE,
  },
  screen: {
    flex: 1,
    backgroundColor: PURPLE,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  promptLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.white,
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  counter: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.white,
    opacity: 0.85,
  },
  question: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.xxl,
    lineHeight: 40,
    color: Colors.white,
    marginBottom: Spacing.lg,
    letterSpacing: -0.5,
  },
  input: {
    flex: 1,
    minHeight: 160,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
    lineHeight: 28,
    color: Colors.white,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: PURPLE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  shareButton: {
    backgroundColor: Colors.black,
    borderRadius: Radius.full,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  shareButtonDisabled: {
    opacity: 0.35,
  },
  shareButtonPressed: {
    opacity: 0.88,
  },
  shareLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  shareArrow: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.white,
    marginTop: -2,
  },
});
