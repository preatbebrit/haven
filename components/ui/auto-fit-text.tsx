import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextLayoutEventData,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type Props = Omit<TextProps, 'style' | 'children'> & {
  children: string;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  maxFontSize: number;
  minFontSize: number;
  /** lineHeight = fontSize * lineHeightRatio. Defaults to 1.33. */
  lineHeightRatio?: number;
};

/**
 * Renders text that shrinks its font size (between max and min) just enough to
 * fit its container's height. Single layout pass: measures the natural text
 * height via onTextLayout, compares against the container height, and snaps to
 * the largest size that fits. Width-bounded by the container.
 */
export function AutoFitText({
  children,
  textStyle,
  containerStyle,
  maxFontSize,
  minFontSize,
  lineHeightRatio = 1.33,
  ...textProps
}: Props) {
  const [fontSize, setFontSize] = useState(maxFontSize);
  const containerHeightRef = useRef(0);

  // Reset to max whenever the content or bounds change so we re-measure.
  useEffect(() => {
    setFontSize(maxFontSize);
  }, [children, maxFontSize]);

  function onContainerLayout(e: LayoutChangeEvent) {
    const next = e.nativeEvent.layout.height;
    if (next === containerHeightRef.current) return;
    containerHeightRef.current = next;
    setFontSize(maxFontSize);
  }

  function onTextLayout(e: { nativeEvent: TextLayoutEventData }) {
    const containerH = containerHeightRef.current;
    if (containerH <= 0) return;
    const totalH = e.nativeEvent.lines.reduce((sum, l) => sum + l.height, 0);
    if (totalH <= containerH + 0.5) return;
    const ratio = containerH / totalH;
    const next = Math.max(minFontSize, Math.floor(fontSize * ratio));
    if (next < fontSize) setFontSize(next);
  }

  return (
    <View style={[styles.container, containerStyle]} onLayout={onContainerLayout}>
      <Text
        {...textProps}
        onTextLayout={onTextLayout}
        style={[textStyle, { fontSize, lineHeight: Math.round(fontSize * lineHeightRatio) }]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
