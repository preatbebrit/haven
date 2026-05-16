import Svg, { Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

type Props = {
  size?: number;
  color?: string;
};

// Figma node 227:3157 — 24×24 frame with a 14×12 checkmark glyph centered.
// Path anchors: left tip → bottom valley → top-right tip, rounded caps/joins.
export function CheckIcon({ size = 24, color = Colors.white }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5 L10 17 L19 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
