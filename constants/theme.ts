// Design tokens from Figma — h@ven design system

/** Raw brand palette */
const havenPalette = {
  black: '#000000',
  white: '#FFFFFF',

  // Gray scale
  gray20:  '#2D2D33',
  gray40:  '#5A5B66',
  gray60:  '#878899',
  gray80:  '#B4B6CC',
  gray100: '#F0F1FF',

  // Brand spectrum: green → teal → sky blue → blue → purple → light purple → magenta → cherry
  green:       '#00FF40',
  teal:        '#00FFAA',
  skyBlue:     '#00E9FF',
  blue:        '#0015FF',
  purple:      '#5500FF',
  lightPurple: '#C000FF',
  magenta:     '#FF00D4',
  cherry:      '#FF006A',
} as const;

/** Light / dark surfaces for ThemedText, ThemedView, useThemeColor */
const light = {
  text: '#000000',
  background: '#ffffff',
  tint: '#000000',
  icon: '#5A5B66',
  tabIconDefault: '#878899',
  tabIconSelected: '#000000',
} as const;

const dark = {
  text: '#FFFFFF',
  background: '#000000',
  tint: '#FFFFFF',
  icon: '#B4B6CC',
  tabIconDefault: '#878899',
  tabIconSelected: '#FFFFFF',
} as const;

export const Colors = {
  light,
  dark,
  ...havenPalette,
} as const;

export type AppColor = keyof typeof havenPalette;

// Typography — Manrope (loaded in app/_layout.tsx via expo-google-fonts)
export const FontFamily = {
  extraLight: 'Manrope_200ExtraLight',
  regular:    'Manrope_400Regular',
  medium:     'Manrope_500Medium',
  semiBold:   'Manrope_600SemiBold',
  bold:       'Manrope_700Bold',
  extraBold:  'Manrope_800ExtraBold',
} as const;

export const FontSize = {
  xs:      12,  // Caption, Caption Bold
  sm:      14,
  md:      16,  // Body, Body Bold
  lg:      20,  // H4
  xl:      24,  // H3
  xxl:     32,  // H2
  h1:      40,  // H1
  display: 48,
} as const;

// Figma text styles — spread directly into StyleSheet: { ...TextStyle.h2 }
// Figma letter spacing is expressed as % of font size — converted to px for React Native:
// H1: 40 × -6% = -2.4  |  H2: 32 × -4% = -1.28  |  H3: 24 × -4% = -0.96  |  H4: 20 × -4% = -0.8
export const TextStyle = {
  h1:          { fontSize: 40, lineHeight: 44, fontFamily: FontFamily.semiBold,  letterSpacing: -2.4 },
  h2:          { fontSize: 32, lineHeight: 40, fontFamily: FontFamily.semiBold,  letterSpacing: -1.28 },
  h3:          { fontSize: 24, lineHeight: 32, fontFamily: FontFamily.semiBold,  letterSpacing: -0.96 },
  h4:          { fontSize: 20, lineHeight: 24, fontFamily: FontFamily.semiBold,  letterSpacing: -0.8 },
  body:        { fontSize: 16, lineHeight: 20, fontFamily: FontFamily.medium,    letterSpacing: 0 },
  bodyBold:    { fontSize: 16, lineHeight: 20, fontFamily: FontFamily.semiBold,  letterSpacing: 0 },
  caption:     { fontSize: 12, lineHeight: 16, fontFamily: FontFamily.medium,    letterSpacing: 0 },
  captionBold: { fontSize: 12, lineHeight: 16, fontFamily: FontFamily.semiBold,  letterSpacing: 0 },
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

// Figma border radius values
// ── Prompt color system ───────────────────────────────────────────────────────
// Each combination is verified accessible: dark bg → white support, light bg → black support.
export type PromptColors = { bg: string; fg: string; support: string };

const PROMPT_COLOR_COMBOS: PromptColors[] = [
  { bg: '#5500FF', fg: '#00E9FF', support: '#FFFFFF' }, // purple / skyBlue
  { bg: '#5500FF', fg: '#00FFAA', support: '#FFFFFF' }, // purple / teal
  { bg: '#5500FF', fg: '#00FF40', support: '#FFFFFF' }, // purple / green
  { bg: '#0015FF', fg: '#00FF40', support: '#FFFFFF' }, // blue / green
  { bg: '#0015FF', fg: '#00FFAA', support: '#FFFFFF' }, // blue / teal
  { bg: '#0015FF', fg: '#00E9FF', support: '#FFFFFF' }, // blue / skyBlue
  { bg: '#00E9FF', fg: '#5500FF', support: '#000000' }, // skyBlue / purple
  { bg: '#00E9FF', fg: '#0015FF', support: '#000000' }, // skyBlue / blue
  { bg: '#00FFAA', fg: '#5500FF', support: '#000000' }, // teal / purple
  { bg: '#00FFAA', fg: '#0015FF', support: '#000000' }, // teal / blue
  { bg: '#00FF40', fg: '#5500FF', support: '#000000' }, // green / purple
  { bg: '#00FF40', fg: '#0015FF', support: '#000000' }, // green / blue
];

export function getRandomPromptColors(): PromptColors {
  return PROMPT_COLOR_COMBOS[Math.floor(Math.random() * PROMPT_COLOR_COMBOS.length)];
}

export const Radius = {
  xs:   4,   // member rows
  sm:   8,   // small elements
  md:   12,  // prompt card header
  lg:   16,  // buttons, tags
  xl:   24,  // group cards
  xxl:  32,  // bottom sheet top corners
  full: 9999,
} as const;
