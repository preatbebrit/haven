import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { AppHeader } from '@/components/ui/app-header';
import { CheckIcon } from '@/components/ui/icons/check-icon';
import { CloseIcon } from '@/components/ui/icons/close-icon';
import { Colors, FontFamily, FontSize, Radius, Spacing, TextStyle } from '@/constants/theme';
import { useFriends } from '@/contexts/friends-context';
import { useTheme } from '@/hooks/use-theme';
import { REPORT_CATEGORY_OPTIONS, type ReportCategory } from '@/lib/friend-report-log';
import { setPendingToast } from '@/lib/pending-toast';

export default function ReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { submitReport } = useFriends();
  const params = useLocalSearchParams<{
    reportedId?: string;
    reportedHandle?: string;
    messageId?: string;
  }>();

  const reportedId = typeof params.reportedId === 'string' ? params.reportedId : '';
  const reportedHandle = typeof params.reportedHandle === 'string' ? params.reportedHandle : '';
  const messageId = typeof params.messageId === 'string' ? params.messageId : undefined;
  const isMessageReport = !!messageId;

  const [selected, setSelected] = useState<ReportCategory | null>(null);
  const [otherText, setOtherText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const otherTrimmed = typeof otherText === 'string' ? otherText.trim() : '';
  // "Other" requires a non-empty custom reason; everything else is enough
  // on its own. Submit stays inactive until that's true.
  const canSubmit =
    !!selected && !submitting && (selected !== 'other' || otherTrimmed.length > 0);

  async function handleSubmit() {
    if (!canSubmit || !selected) return;
    if (!reportedId) {
      router.back();
      return;
    }
    setSubmitting(true);
    const customReason = selected === 'other' ? otherTrimmed : undefined;
    const { banned } = await submitReport({
      reportedId,
      category: selected,
      customReason,
      messageId,
    });
    const toast = banned
      ? `@${reportedHandle} has been banned`
      : isMessageReport
        ? 'Message reported'
        : 'Report submitted';
    setPendingToast(toast);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { backgroundColor: colors.backgroundPrimary }]}>
        <AppHeader
          left={{
            kind: 'icon',
            icon: <CloseIcon size={20} color={colors.textPrimaryInverted} />,
            onPress: () => router.back(),
            accessibilityLabel: 'Close',
          }}
          center={{ kind: 'title', title: 'Report' }}
          right={{ kind: 'spacer' }}
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: 96 + insets.bottom + Spacing.lg },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.heading, { color: colors.textPrimary }]}>
              {isMessageReport
                ? 'Why are you reporting this message?'
                : `Why are you reporting @${reportedHandle}?`}
            </Text>
            <Text style={[styles.subheading, { color: colors.textSecondary }]}>
              We use reports to keep h@ven safe. Two reports from different members will remove this
              {isMessageReport ? ' user' : ''} from the app.
            </Text>

            <View style={[styles.list, { backgroundColor: colors.backgroundPrimary }]}>
              {REPORT_CATEGORY_OPTIONS.map((opt, idx) => {
                const isLast = idx === REPORT_CATEGORY_OPTIONS.length - 1;
                const isSelected = selected === opt.value;
                return (
                  <View key={opt.value}>
                    <Pressable
                      onPress={() => setSelected(opt.value)}
                      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
                      accessibilityRole="radio"
                      accessibilityLabel={opt.label}
                      accessibilityState={{ selected: isSelected }}
                      disabled={submitting}
                    >
                      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{opt.label}</Text>
                      <View
                        style={[
                          styles.radioOuter,
                          isSelected && {
                            borderColor: colors.buttonPrimary,
                            backgroundColor: colors.buttonPrimary,
                          },
                        ]}
                      >
                        {isSelected ? <CheckIcon size={16} color={colors.textPrimaryInverted} /> : null}
                      </View>
                    </Pressable>
                    {isSelected && opt.value === 'other' ? (
                      <View style={styles.otherWrap}>
                        <TextInput
                          value={otherText}
                          onChangeText={setOtherText}
                          placeholder="Tell us briefly..."
                          placeholderTextColor={Colors.gray60}
                          style={[
                            styles.otherInput,
                            { borderColor: colors.gray80, color: colors.textPrimary },
                          ]}
                          multiline
                          autoFocus
                          maxLength={300}
                          editable={!submitting}
                        />
                      </View>
                    ) : null}
                    {!isLast ? <View style={[styles.divider, { backgroundColor: colors.gray100 }]} /> : null}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingBottom: insets.bottom + Spacing.md,
                backgroundColor: colors.backgroundPrimary,
                borderTopColor: colors.gray100,
              },
            ]}
          >
            <PrimaryNextButton
              label="Submit report"
              inactive={!canSubmit}
              onPress={handleSubmit}
            />
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
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  heading: {
    ...TextStyle.h3,
    color: Colors.black,
    marginBottom: Spacing.sm,
  },
  subheading: {
    ...TextStyle.body,
    color: Colors.gray40,
    marginBottom: Spacing.lg,
  },
  list: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  rowLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    lineHeight: 20,
    color: Colors.black,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray100,
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
  otherWrap: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  otherInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: Colors.gray80,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: 22,
    color: Colors.black,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
});
