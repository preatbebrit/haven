import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingHeader } from '@/components/onboarding/onboarding-header';
import { PrimaryNextButton } from '@/components/onboarding/primary-next-button';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';

type Phase = 'entry' | 'success';

const PAD_ROWS: (string | 'del' | 'empty')[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['empty', '0', 'del'],
];

export default function OnboardingLockScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setLockPin, setLockSkipped } = useOnboarding();
  const [phase, setPhase] = useState<Phase>('entry');
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);

  const full = pin.length === 4;

  function appendDigit(d: string) {
    if (pin.length >= 4) return;
    setPin((p) => (p + d).slice(0, 4));
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  function handlePadKey(k: string | 'del' | 'empty') {
    if (k === 'empty') return;
    if (k === 'del') {
      backspace();
      return;
    }
    appendDigit(k);
  }

  function handleSetCode() {
    if (!full) return;
    setLockPin(pin);
    setLockSkipped(false);
    setPhase('success');
  }

  function handleSkip() {
    setLockPin(null);
    setLockSkipped(true);
    router.push('/onboarding/gender');
  }

  function handleGotIt() {
    router.push('/onboarding/gender');
  }

  if (phase === 'success') {
    return (
      <View style={styles.screen}>
        <OnboardingHeader step={3} />
        <View style={styles.brandRow}>
          <Text style={styles.brand}>
            <Text style={styles.brandPlain}>h</Text>
            <Text style={styles.brandAt}>@</Text>
            <Text style={styles.brandPlain}>ven</Text>
          </Text>
        </View>
        <View style={styles.successBody}>
          <Text style={styles.lockEmoji}>🔒</Text>
          <Text style={styles.successTitle}>Lock screen set!</Text>
          <Text style={styles.successSub}>
            You can always turn this off from your settings.
          </Text>
        </View>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <PrimaryNextButton label="Got it" disabled={false} onPress={handleGotIt} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <OnboardingHeader step={3} />
      <Pressable style={styles.body} onPress={() => inputRef.current?.focus()}>
        <Text style={styles.title}>Add a lock screen?</Text>
        <Text style={styles.subtitle}>
          Your privacy is very important. A short PIN helps keep your chats and profile safe if
          someone picks up your phone.
        </Text>

        <TextInput
          ref={inputRef}
          value={pin}
          onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          style={styles.hiddenInput}
          accessibilityLabel="PIN entry"
        />

        <View style={styles.pinRow}>
          {[0, 1, 2, 3].map((i) => (
            <Pressable
              key={i}
              style={[styles.pinDot, pin[i] ? styles.pinDotFilled : styles.pinDotEmpty]}
              onPress={() => inputRef.current?.focus()}
            />
          ))}
        </View>

        <View style={styles.pad}>
          {PAD_ROWS.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.padRow}>
              {row.map((k, colIdx) =>
                k === 'empty' ? (
                  <View key={`e-${colIdx}`} style={styles.padCell} />
                ) : (
                  <Pressable
                    key={k}
                    style={({ pressed }) => [styles.padKey, pressed && styles.padKeyPressed]}
                    onPress={() => handlePadKey(k)}
                    accessibilityRole="button"
                    accessibilityLabel={k === 'del' ? 'Delete' : k}
                  >
                    {k === 'del' ? (
                      <Text style={styles.padKeyText}>⌫</Text>
                    ) : (
                      <Text style={styles.padKeyText}>{k}</Text>
                    )}
                  </Pressable>
                ),
              )}
            </View>
          ))}
        </View>
      </Pressable>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <PrimaryNextButton
          label="Set Lock Code"
          disabled={!full}
          onPress={handleSetCode}
        />
        <Pressable style={styles.skip} onPress={handleSkip} accessibilityRole="button">
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
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
    fontSize: FontSize.sm,
    color: Colors.gray40,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: Spacing.xl,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  pinDotEmpty: {
    borderWidth: 2,
    borderColor: Colors.gray60,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  pad: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: Spacing.md,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  padCell: {
    flex: 1,
    height: 68,
  },
  padKey: {
    flex: 1,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  padKeyPressed: {
    backgroundColor: Colors.gray100,
  },
  padKeyText: {
    fontFamily: FontFamily.medium,
    fontSize: 28,
    color: Colors.black,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray100,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  skipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.black,
  },
  brandRow: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  brand: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.xl,
  },
  brandPlain: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.xl,
    color: Colors.black,
  },
  brandAt: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.xl,
    color: Colors.cyan,
  },
  successBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  lockEmoji: {
    fontSize: 72,
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.xxl,
    color: Colors.black,
    marginBottom: Spacing.sm,
  },
  successSub: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.gray40,
    textAlign: 'center',
    lineHeight: 24,
  },
});
