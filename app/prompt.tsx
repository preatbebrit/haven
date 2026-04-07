import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MOCK_GROUP_CARDS } from '@/constants/mock-groups';
import { Colors, FontFamily, FontSize, Radius, Spacing, TextStyle } from '@/constants/theme';
import { setPendingPromptShare } from '@/lib/pending-share';

const MAX_CHARS = 300;

export default function PromptScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [answer, setAnswer] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const group = useMemo(
    () => MOCK_GROUP_CARDS.find((g) => g.id === id) ?? MOCK_GROUP_CARDS[0],
    [id],
  );

  const { bg, fg, support } = group.promptColors;
  const isLightBg = support === Colors.black;
  const length = answer.length;
  const canShare = length > 0 && length <= MAX_CHARS;

  function handleShare() {
    if (!canShare) return;
    setPendingPromptShare(group.id, answer.trim());
    router.replace({ pathname: '/answers', params: { groupId: group.id } });
  }

  function handleChangeText(t: string) {
    setAnswer(t.slice(0, MAX_CHARS));
    // Scroll to bottom so the latest text is always visible
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 0);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.flex, { backgroundColor: bg }]}>
        <StatusBar style={isLightBg ? 'dark' : 'light'} />

        {/* ── Custom top bar (outside KAV so it never moves) ── */}
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm, backgroundColor: bg }]}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={Colors.white} />
          </Pressable>
        </View>

        {/* ── KAV wraps ScrollView + footer so both rise above the keyboard ── */}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            style={[styles.screen, { backgroundColor: bg }]}
            contentContainerStyle={styles.screenContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topRow}>
              <Text style={[styles.promptLabel, { color: fg }]}>Prompt</Text>
              <Text style={[styles.counter, { color: support }]}>
                {length}/{MAX_CHARS}
              </Text>
            </View>

            <Text style={[styles.question, { color: fg }]}>{group.question}</Text>

            <TextInput
              style={[
                styles.input,
                {
                  color: support,
                  backgroundColor: isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.2)',
                  borderColor: isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)',
                },
              ]}
              value={answer}
              onChangeText={handleChangeText}
              placeholder="Share honestly — this is your space."
              placeholderTextColor={isLightBg ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.45)'}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              maxLength={MAX_CHARS}
              autoCorrect
              accessibilityLabel="Your answer to the prompt"
            />
          </ScrollView>

          {/* ── Footer stays pinned above the keyboard ── */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md), backgroundColor: bg, borderTopColor: isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)' }]}>
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  // ── Top bar ───────────────────────────────────────────────────────────────
  topBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    opacity: 0.85,
  },

  // ── Content ───────────────────────────────────────────────────────────────
  screen: {
    flex: 1,
  },
  screenContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
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
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  counter: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    opacity: 0.85,
  },
  question: {
    fontFamily: FontFamily.semiBold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -1.28,
    marginBottom: Spacing.lg,
  },
  input: {
    minHeight: 160,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
    lineHeight: 28,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  shareButton: {
    backgroundColor: Colors.black,
    borderRadius: Radius.lg,
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
