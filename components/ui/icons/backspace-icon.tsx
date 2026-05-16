import Svg, { Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

type Props = {
  size?: number;
  color?: string;
};

// 24×24 backspace key glyph: arrow-pointing-left outline (5,5 → 21.33,5 →
// 21.33,18 → 8.5,18 → 2,11.5) with an inset X marking the delete affordance.
export function BackspaceIcon({ size = 24, color = Colors.black }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.3333 18V5H8.5L2 11.5L8.5 18H21.3333Z"
        stroke={color}
        strokeWidth={2}
      />
      <Path d="M11.5 8.5L17.5 14.5" stroke={color} strokeWidth={1.6} />
      <Path d="M17.5 8.5L11.5 14.5" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}
