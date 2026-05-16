import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** The toast message. When `null`, the toast is unmounted (exit animation plays). */
  message: string | null;
  /** Called when the auto-dismiss timer fires. Parent should set message back to null. */
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. Defaults to 3000. */
  durationMs?: number;
};

const DEFAULT_DURATION_MS = 3000;

/**
 * Shared toast pill — animated, theme-aware, anchored at the top safe area.
 * Render at the top level of a screen; pass message + onDismiss from a `useState`.
 * The component handles its own auto-dismiss timer; parent only manages visibility.
 */
export function Toast({ message, onDismiss, durationMs = DEFAULT_DURATION_MS }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(id);
  }, [message, durationMs, onDismiss]);

  if (!message) return null;
  return (
    <Animated.View
      entering={FadeInDown.duration(280).springify().damping(18)}
      exiting={FadeOutUp.duration(220)}
      style={[
        styles.toast,
        { top: insets.top + Spacing.md, backgroundColor: colors.gray20 },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.toastText, { color: colors.textPrimaryInverted }]}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    // Sits above page content (KeyboardAvoidingView, sheets, overlays).
    zIndex: 200,
    elevation: 200,
  },
  toastText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
});
