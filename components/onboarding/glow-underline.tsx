import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Colors } from '@/constants/theme';

type Variant = 'default' | 'error';

type Props = ViewProps & {
  variant?: Variant;
  children?: ReactNode;
};

export function GlowUnderline({ variant = 'default', style, children, ...rest }: Props) {
  const isError = variant === 'error';
  return (
    <View style={[styles.wrap, style]} {...rest}>
      {children}
      <View
        style={[
          styles.glow,
          isError ? styles.glowError : styles.glowDefault,
        ]}
      />
      <View style={[styles.line, isError && styles.lineError]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    paddingBottom: 10,
  },
  glow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 2,
    height: 10,
    borderRadius: 8,
    opacity: 0.45,
  },
  glowDefault: {
    backgroundColor: Colors.purple,
    shadowColor: Colors.skyBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  glowError: {
    backgroundColor: Colors.cherry,
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 3,
  },
  line: {
    height: 2,
    backgroundColor: Colors.black,
    borderRadius: 1,
    opacity: 0.85,
  },
  lineError: {
    backgroundColor: '#d32f2f',
    opacity: 1,
  },
});
