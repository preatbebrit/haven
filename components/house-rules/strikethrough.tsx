import Svg, { Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

type Props = {
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
};

// Hand-drawn strikethrough used on House Rules 2 ("dating app"). Slight
// rise/fall along the length keeps it organic. Figma node 606:13766.
export function Strikethrough({
  width = 380,
  height = 8,
  color = Colors.cherry,
  strokeWidth = 4,
}: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 380 8" fill="none">
      <Path
        d="M2 5 Q 95 2.5 190 4 T 378 3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}
