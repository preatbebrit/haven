import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { BackspaceIcon } from '@/components/ui/icons/backspace-icon';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';

const PAD_ROWS: (string | 'del' | 'empty')[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['empty', '0', 'del'],
];

type Props = {
  pin: string;
  onPinChange: (next: string) => void;
  dotFilledColor: string;
  dotEmptyBorderColor: string;
  keyTextColor: string;
  keyPressedBg: string;
  disabled?: boolean;
  // When true, the dots vertically center in the space between the previous
  // sibling and the keypad, instead of sitting tight against the content above.
  centerDots?: boolean;
  // Optional: parent-owned shared value applied as translateX to the dot row.
  // Used by callers like the lock overlay to play a shake on wrong PIN.
  dotsTranslateX?: SharedValue<number>;
};

export function PinPad({
  pin,
  onPinChange,
  dotFilledColor,
  dotEmptyBorderColor,
  keyTextColor,
  keyPressedBg,
  disabled = false,
  centerDots = false,
  dotsTranslateX,
}: Props) {
  const inputRef = useRef<TextInput>(null);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dotsTranslateX ? dotsTranslateX.value : 0 }],
  }));

  function appendDigit(d: string) {
    if (disabled) return;
    if (pin.length >= 4) return;
    onPinChange((pin + d).slice(0, 4));
  }

  function backspace() {
    if (disabled) return;
    onPinChange(pin.slice(0, -1));
  }

  function handlePadKey(k: string | 'del' | 'empty') {
    if (k === 'empty') return;
    if (k === 'del') {
      backspace();
      return;
    }
    appendDigit(k);
  }

  return (
    <>
      <TextInput
        ref={inputRef}
        value={pin}
        onChangeText={(t) => !disabled && onPinChange(t.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
        style={styles.hiddenInput}
        accessibilityLabel="PIN entry"
        editable={!disabled}
      />

      <Animated.View style={[centerDots ? styles.pinRowCentered : styles.pinRow, shakeStyle]}>
        {[0, 1, 2, 3].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.pinDot,
              pin[i]
                ? { backgroundColor: dotFilledColor, borderWidth: 2, borderColor: dotFilledColor }
                : { borderWidth: 2, borderColor: dotEmptyBorderColor, backgroundColor: 'transparent' },
            ]}
          />
        ))}
      </Animated.View>

      <View style={centerDots ? styles.padStatic : styles.pad}>
        {PAD_ROWS.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.padRow}>
            {row.map((k, colIdx) =>
              k === 'empty' ? (
                <View key={`e-${colIdx}`} style={styles.padCell} />
              ) : (
                <Pressable
                  key={k}
                  style={({ pressed }) => [
                    styles.padKey,
                    pressed && !disabled ? { backgroundColor: keyPressedBg } : null,
                  ]}
                  onPress={() => handlePadKey(k)}
                  accessibilityRole="button"
                  accessibilityLabel={k === 'del' ? 'Delete' : k}
                  disabled={disabled}
                >
                  {k === 'del' ? (
                    <View style={{ opacity: disabled ? 0.4 : 1 }}>
                      <BackspaceIcon size={28} color={keyTextColor} />
                    </View>
                  ) : (
                    <Animated.Text
                      style={[
                        styles.padKeyText,
                        { color: keyTextColor, opacity: disabled ? 0.4 : 1 },
                      ]}
                    >
                      {k}
                    </Animated.Text>
                  )}
                </Pressable>
              ),
            )}
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: Spacing.xl,
  },
  pinRowCentered: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  pinDot: { width: 18, height: 18, borderRadius: 9 },
  pad: { flex: 1, justifyContent: 'flex-end', paddingBottom: Spacing.md },
  padStatic: { paddingBottom: Spacing.md },
  padRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  padCell: { flex: 1, height: 68 },
  padKey: {
    flex: 1,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  padKeyText: { fontFamily: FontFamily.medium, fontSize: 28, color: Colors.black },
});
