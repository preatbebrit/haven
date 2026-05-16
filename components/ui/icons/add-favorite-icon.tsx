import Svg, { Circle, Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

type Props = {
  size?: number;
  color?: string;
};

export function AddFavoriteIcon({ size = 24, color = Colors.gray40 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={11.5} stroke={color} strokeDasharray="4 4" />
      <Path
        d="M11.4772 6.02284L13.1805 10.0356L17.5231 9.65562L14.2332 12.5156L15.9365 16.5283L12.1998 14.2831L8.90987 17.143L9.89049 12.8955L6.15388 10.6503L10.4965 10.2704L11.4772 6.02284Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
