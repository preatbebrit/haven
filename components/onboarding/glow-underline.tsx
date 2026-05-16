import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent, type ViewProps } from 'react-native';
import Svg, { Defs, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';

import { Colors } from '@/constants/theme';

type Variant = 'default' | 'error';

type Props = ViewProps & {
  variant?: Variant;
  children?: ReactNode;
};

// Figma node 32:5827 — bg-gradient-to-r from-[#0fa] to-[#0015ff], blur-[20px], opacity-40.
// SVG's FeGaussianBlur doesn't render reliably on native react-native-svg, and stacked
// opacity layers band visibly. Instead: lay down one wide rect with the horizontal color
// gradient, and multiply by a vertical bell-curve alpha mask. That mimics a 1-D Gaussian
// blur across the bar and reads as a soft glow without banding.
const GLOW_CANVAS_HEIGHT = 16;
const WAVE_DURATION_MS = 4000;

export function GlowUnderline({ variant = 'default', style, children, ...rest }: Props) {
  const isError = variant === 'error';
  const [width, setWidth] = useState(0);
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (width === 0) return;
    wave.setValue(0);
    const loop = Animated.loop(
      Animated.timing(wave, {
        toValue: 1,
        duration: WAVE_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [wave, width]);

  const translateX = wave.interpolate({ inputRange: [0, 1], outputRange: [0, -width] });
  const doubleWidth = width * 2;
  const startColor = isError ? Colors.cherry : Colors.teal;
  const midColor = isError ? Colors.lightPurple : Colors.blue;

  const handleLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    if (next !== width) setWidth(next);
  };

  return (
    <View style={[styles.wrap, style]} {...rest}>
      {children}
      <View style={[styles.line, isError && styles.lineError]} />
      <View style={styles.glowHost} onLayout={handleLayout} pointerEvents="none">
        {width > 0 ? (
          <Animated.View style={{ width: doubleWidth, height: GLOW_CANVAS_HEIGHT, transform: [{ translateX }] }}>
            <Svg width={doubleWidth} height={GLOW_CANVAS_HEIGHT}>
              <Defs>
                <LinearGradient id="glowHorz" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={startColor} />
                  <Stop offset="0.25" stopColor={midColor} />
                  <Stop offset="0.5" stopColor={startColor} />
                  <Stop offset="0.75" stopColor={midColor} />
                  <Stop offset="1" stopColor={startColor} />
                </LinearGradient>
                <LinearGradient id="glowVertAlpha" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="white" stopOpacity="0" />
                  <Stop offset="0.4" stopColor="white" stopOpacity="0.1" />
                  <Stop offset="0.7" stopColor="white" stopOpacity="0.5" />
                  <Stop offset="0.95" stopColor="white" stopOpacity="1" />
                  <Stop offset="1" stopColor="white" stopOpacity="1" />
                </LinearGradient>
                <Mask id="softMask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
                  <Rect width={doubleWidth} height={GLOW_CANVAS_HEIGHT} fill="url(#glowVertAlpha)" />
                </Mask>
              </Defs>
              <Rect
                width={doubleWidth}
                height={GLOW_CANVAS_HEIGHT}
                fill="url(#glowHorz)"
                mask="url(#softMask)"
                opacity={0.45}
              />
            </Svg>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    paddingBottom: 10,
  },
  line: {
    height: 1,
    backgroundColor: Colors.black,
  },
  lineError: {
    backgroundColor: Colors.cherry,
  },
  glowHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    height: GLOW_CANVAS_HEIGHT,
    overflow: 'hidden',
  },
});
