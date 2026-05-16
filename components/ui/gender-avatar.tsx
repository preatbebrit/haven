import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export type GenderSymbol =
  | 'cis-woman' | 'nonbinary' | 'pangender' | 'cis-man'
  | 'gender-fluid' | 'androgynous' | 'third-gender' | 'gender-questioning'
  | 'agender' | 'demigender' | 'intergender' | 'intersex'
  | 'transgender' | 'two-spirit';

// ─── Design-system color pairs (bg / symbol) ─────────────────────────────────
// All colors from the h@ven brand spectrum, curated for contrast
const COLOR_PAIRS: [string, string][] = [
  ['#0015FF', '#FF006A'],   // blue / cherry
  ['#0015FF', '#C000FF'],   // blue / lightPurple
  ['#0015FF', '#00FFAA'],   // blue / teal
  ['#FF00D4', '#00FFAA'],   // magenta / teal
  ['#00FF40', '#FF00D4'],   // green / magenta
  ['#00FF40', '#0015FF'],   // green / blue
  ['#00FFAA', '#FF00D4'],   // teal / magenta
  ['#00FFAA', '#5500FF'],   // teal / purple
  ['#5500FF', '#00FF40'],   // purple / green
  ['#5500FF', '#00FFAA'],   // purple / teal
  ['#00E9FF', '#FF00D4'],   // skyBlue / magenta
  ['#00E9FF', '#0015FF'],   // skyBlue / blue
  ['#C000FF', '#00FFAA'],   // lightPurple / teal
  ['#FF006A', '#0015FF'],   // cherry / blue
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Returns a consistent bg/symbol color pair for a given seed (e.g. user ID). */
export function getAvatarColors(seed: string): { bg: string; symbol: string } {
  const [bg, symbol] = COLOR_PAIRS[hashString(seed) % COLOR_PAIRS.length];
  return { bg, symbol };
}

// ─── Symbol path components ───────────────────────────────────────────────────

const SW = 2.8; // Figma stroke-width (bumped for visual weight at small sizes)

function CisWoman({ c }: { c: string }) {
  return (
    <Svg viewBox="0 0 18.223 33.6345" width="100%" height="100%">
      <Path d="M1.18846 17.7883H17.0346" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Circle cx={9.11131} cy={6.29992} r={5.11146} stroke={c} strokeWidth={SW} fill="none" />
      <Path d="M9.11186 11.4499V32.446" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function Nonbinary({ c }: { c: string }) {
  return (
    <Svg viewBox="0 0 23.9747 45.8323" width="100%" height="100%">
      <Circle cx={11.9873} cy={33.845} r={10.7989} stroke={c} strokeWidth={SW} fill="none" />
      <Path d="M3.91592 9.39909H19.762" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M5.91272 4.14462L17.7707 14.6559" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M17.3648 3.72623L6.31983 15.0887" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M11.5071 1.18846V22.1845" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function Pangender({ c }: { c: string }) {
  return (
    <Svg viewBox="0 0 22.7485 41.434" width="100%" height="100%">
      <Path d="M5.12154 16.1172L15.9609 21.2823" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Circle cx={10.8218} cy={18.7839} r={6.89564} stroke={c} strokeWidth={SW} fill="none" transform="rotate(25.4782 10.8218 18.7839)" />
      <Path d="M12.8109 4.12958L20.7806 7.92721" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M15.0745 1.96544L18.5192 10.0939" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M20.9345 4.49958L12.6564 7.56727" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M18.5966 1.81938L13.5647 12.3792" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M8.03244 25.8831L1.18873 40.2453" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M9.95876 33.3786L1.30567 29.2984" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function CisMan({ c }: { c: string }) {
  return (
    <Svg viewBox="0 0 44.6261 37.559" width="100%" height="100%">
      <Circle cx={13.1775} cy={24.3815} r={11.989} stroke={c} strokeWidth={SW} fill="none" />
      <Path d="M40.529 5.86994L22.9957 17.4207M40.529 5.86994L32.2988 2.8744M40.529 5.86994L39.701 15.3337" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function GenderFluid({ c }: { c: string }) {
  return (
    <Svg viewBox="0 0 28.0599 42.1475" width="100%" height="100%">
      <Circle cx={14.3574} cy={20.8693} r={8.25208} stroke={c} strokeWidth={SW} fill="none" />
      <Path d="M20.9761 25.7817L26.8712 15.7573" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M1.18865 27.0618L7.08378 17.0375" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M14.1671 1.31447L14.6348 12.1775M14.1671 1.31447L10.917 2.99699M14.1671 1.31447L17.0052 2.54052" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M15.8178 30.0959L16.2855 40.959" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function Androgynous({ c }: { c: string }) {
  return (
    <Svg viewBox="0 0 18.8812 37.2876" width="100%" height="100%">
      <Circle cx={9.44054} cy={27.8471} r={8.25208} stroke={c} strokeWidth={SW} fill="none" />
      <Path d="M8.6664 1.49659L9.1341 19.1044M8.6664 1.49659L5.41629 4.22376M8.6664 1.49659L11.5045 3.48387" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M13.6188 11.2512L4.06189 11.6863" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function ThirdGender({ c }: { c: string }) {
  return (
    <Svg viewBox="0 0 23.7281 32.8757" width="100%" height="100%">
      <Circle cx={12.9527} cy={10.7754} r={6.89564} stroke={c} strokeWidth={SW} fill="none" transform="rotate(25.4782 12.9527 10.7754)" />
      <Path d="M10.6413 16.7874C11.2422 17.0516 11.5157 17.7527 11.2516 18.3536L7.82119 26.1541L9.01815 28.4845C9.9792 30.3552 8.00548 32.3725 6.11419 31.4527L2.42138 29.6563C0.492303 28.7179 0.924946 25.8528 3.04498 25.5258L5.67952 25.1185L9.07556 17.3968C9.33972 16.796 10.0405 16.5234 10.6413 16.7874Z" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function GenderQuestioning({ c }: { c: string }) {
  return (
    <Svg viewBox="0 0 32.0028 40.3256" width="100%" height="100%">
      <Circle cx={16.0014} cy={24.3243} r={10.42} stroke={c} strokeWidth={SW} fill="none" transform="rotate(32.0822 16.0014 24.3243)" />
      <Path d="M19.3921 13.8322C18.8623 13.6761 18.55 13.1157 18.7595 12.6047C19.0456 11.9069 19.4163 11.3032 19.9565 10.7927C20.967 9.7327 22.0702 9.71839 23.5599 8.8751C24.3915 8.37844 24.7524 7.76818 24.9911 6.95846C25.1649 6.36852 25.1722 5.81749 24.9635 5.3411C24.6361 4.5657 23.8801 4.10401 23.0355 3.85508C22.2623 3.62719 21.4788 3.60997 20.904 3.89316C20.5919 4.02306 20.3368 4.22728 20.1359 4.48728C19.794 4.92957 19.258 5.26872 18.7218 5.11069L18.1313 4.93664C17.5671 4.77036 17.2616 4.14916 17.5721 3.64964C18.1608 2.7026 18.9974 1.95256 19.9898 1.59957C21.1137 1.16392 22.4531 1.18153 23.6307 1.52862C25.308 2.02297 26.7503 2.96354 27.412 4.40321C27.9024 5.41523 27.966 6.60319 27.6455 7.69053C27.2091 9.17116 26.1272 10.2101 24.8279 10.9335C23.8042 11.5118 22.7586 11.7694 22.1037 12.3684C21.7288 12.7148 21.5344 13.0063 21.3821 13.377C21.1722 13.8878 20.6442 14.2013 20.1144 14.0451L19.3921 13.8322Z" fill={c} />
    </Svg>
  );
}

function Agender({ c }: { c: string }) {
  return (
    <Svg viewBox="0 0 32.0028 39.3754" width="100%" height="100%">
      <Path d="M8.31142 18.6289L23.4956 28.5626" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Circle cx={16.0014} cy={23.374} r={10.42} stroke={c} strokeWidth={SW} fill="none" transform="rotate(32.0822 16.0014 23.374)" />
      <Path d="M28.405 1.18866L21.2738 13.526" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function Demigender({ c }: { c: string }) {
  return (
    <Svg viewBox="0 0 16.1683 49.5653" width="100%" height="100%">
      <Path d="M1.79149 24.9034H13.7986" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Circle cx={8.08421} cy={24.8588} r={6.89564} stroke={c} strokeWidth={SW} fill="none" />
      <Path d="M7.55316 1.18846V17.0978" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M8.62 32.4675V48.3769" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M13.5834 38.4054L4.01668 38.4443" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function Intergender({ c }: { c: string }) {
  return (
    <Svg viewBox="0 0 29.8036 25.4352" width="100%" height="100%">
      <Circle cx={8.12242} cy={17.3128} r={6.93396} stroke={c} strokeWidth={SW} fill="none" />
      <Path d="M12.7432 10.7379L23.5504 3.61815L18.4774 1.77174" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M28.1149 9.27048L22.004 13.2353M15.8931 17.2L22.004 13.2353M22.004 13.2353L23.5057 15.9828" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function Intersex({ c }: { c: string }) {
  return (
    <Svg viewBox="0 0 21.002 40.7503" width="100%" height="100%">
      <Path d="M1.35347 25.0402L11.2482 24.768" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Circle cx={6.30001} cy={13.4155} r={5.11146} stroke={c} strokeWidth={SW} fill="none" />
      <Path d="M18.8612 3.06722L9.69973 9.10276M18.8612 3.06722L14.5608 1.50199M18.8612 3.06722L18.4286 8.01225" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M6.30084 18.5658V39.5619" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function Transgender({ c }: { c: string }) {
  return (
    <Svg viewBox="0 0 30.2647 41.5753" width="100%" height="100%">
      <Path d="M10.6158 25.8652L20.5105 25.593" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Circle cx={15.5626} cy={14.2406} r={5.11146} stroke={c} strokeWidth={SW} fill="none" />
      <Path d="M28.1238 3.89232L18.9623 9.92786M28.1238 3.89232L23.8234 2.32708M28.1238 3.89232L27.6912 8.83735" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M2.67261 2.66969L10.6469 10.2044M2.67261 2.66969L7.17953 1.875M2.67261 2.66969L2.23998 7.61472" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M10.7919 5.0841L5.78512 10.669" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M15.5631 19.3907V40.3868" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function TwoSpirit({ c }: { c: string }) {
  return (
    <Svg viewBox="0 0 33.4367 30.4398" width="100%" height="100%">
      <Circle cx={17.667} cy={9.44058} r={8.25208} stroke={c} strokeWidth={SW} fill="none" />
      <Path d="M4.5223 14.1297C5.77295 11.7968 12.3356 10.2571 16.6965 9.57767C17.475 9.45637 18.0487 10.254 17.6992 10.9601C16.2679 13.8518 14.0245 18.1684 12.5116 20.3497C10.958 22.5896 5.9316 25.1713 2.52957 26.6611C1.80819 26.977 1.05026 26.3528 1.21088 25.5818C1.97053 21.9356 3.30545 16.3995 4.5223 14.1297Z" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
      <Path d="M30.4243 16.3958C29.5978 13.8812 23.4022 11.2253 19.2255 9.79893C18.4799 9.54429 17.7764 10.2302 17.998 10.9863C18.9054 14.0825 20.3652 18.7231 21.4763 21.134C22.6174 23.6097 27.1191 27.025 30.2107 29.0829C30.8663 29.5192 31.7211 29.0362 31.6968 28.249C31.5818 24.5263 31.2285 18.8425 30.4243 16.3958Z" stroke={c} strokeWidth={SW} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

const SYMBOLS: Record<GenderSymbol, React.ComponentType<{ c: string }>> = {
  'cis-woman':          CisWoman,
  'nonbinary':          Nonbinary,
  'pangender':          Pangender,
  'cis-man':            CisMan,
  'gender-fluid':       GenderFluid,
  'androgynous':        Androgynous,
  'third-gender':       ThirdGender,
  'gender-questioning': GenderQuestioning,
  'agender':            Agender,
  'demigender':         Demigender,
  'intergender':        Intergender,
  'intersex':           Intersex,
  'transgender':        Transgender,
  'two-spirit':         TwoSpirit,
};

// ─── GenderAvatar ─────────────────────────────────────────────────────────────

type Props = {
  symbol: GenderSymbol;
  size?: number;
  bgColor?: string;
  symbolColor?: string;
};

export function GenderAvatar({ symbol, size = 32, bgColor, symbolColor }: Props) {
  const SymbolComponent = symbol ? SYMBOLS[symbol] : undefined;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor ?? '#0015FF',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {SymbolComponent && (
        <View style={{ width: size * 1.15, height: size * 1.15 }}>
          <SymbolComponent c={symbolColor ?? '#FF006A'} />
        </View>
      )}
    </View>
  );
}
