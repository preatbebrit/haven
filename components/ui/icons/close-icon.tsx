import Svg, { Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

type Props = {
  size?: number;
  color?: string;
};

// Figma node 88:3712 — 16×16 X glyph centered in a 24×24 frame. The two strokes
// span the inset-4 box, rendered with rounded caps/joins for soft corners.
export function CloseIcon({ size = 24, color = Colors.white }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4 L20 20" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M20 4 L4 20" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
