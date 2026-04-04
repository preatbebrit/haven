// Design tokens from Figma — haven color palette + Expo template semantic colors

/** Flat brand palette (use as Colors.black, Colors.cyan, …) */
const havenPalette = {
  black: '#000000',
  gray20: '#2d2d33',
  gray40: '#5a5b66',
  gray60: '#878899',
  gray80: '#b4b6cc',
  gray100: '#f0f1ff',
  white: '#ffffff',

  pink: '#ff006a',
  magenta: '#ff00d4',
  purple: '#c000ff',
  violet: '#5500ff',
  blue: '#0015ff',
  skyBlue: '#007fff',
  cyan: '#00e9ff',
  aqua: '#00ffaa',
  green: '#00ff40',
} as const;

/** Light / dark surfaces for ThemedText, ThemedView, Collapsible, useThemeColor */
const light = {
  text: '#11181C',
  background: '#ffffff',
  tint: '#0a7ea4',
  icon: '#687076',
  tabIconDefault: '#687076',
  tabIconSelected: '#0a7ea4',
} as const;

const dark = {
  text: '#ECEDEE',
  background: '#151718',
  tint: '#ffffff',
  icon: '#9BA1A6',
  tabIconDefault: '#9BA1A6',
  tabIconSelected: '#ffffff',
} as const;

export const Colors = {
  light,
  dark,
  ...havenPalette,
} as const;

export type AppColor = keyof typeof havenPalette;

// Semantic aliases for common UI roles
export const Theme = {
  background: havenPalette.black,
  surface: havenPalette.gray20,
  textPrimary: havenPalette.white,
  textSecondary: havenPalette.gray60,
  textMuted: havenPalette.gray40,
  border: havenPalette.gray20,
  accent: havenPalette.cyan,
} as const;

// Typography — Manrope (load via expo-font)
export const FontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
} as const;

/**
 * Template-style font roles (Expo starter). Maps to loaded Manrope where applicable.
 * `mono` uses system monospace (Menlo on iOS).
 */
export const Fonts = {
  sans: FontFamily.regular,
  serif: FontFamily.regular,
  rounded: FontFamily.extraBold,
  mono: process.env.EXPO_OS === 'ios' ? 'Menlo' : 'monospace',
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  display: 48,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 9999,
} as const;
