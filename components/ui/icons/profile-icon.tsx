import Svg, { Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

type Props = {
  size?: number;
  color?: string;
};

export function ProfileIcon({ size = 24, color = Colors.white }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 23" fill="none">
      <Path
        d="M9 12C13.4181 12 16.9997 15.3596 17 19.5039C17 23.6485 13.4183 21.3809 9 21.3809C4.58172 21.3809 1 23.6485 1 19.5039C1.00027 15.3596 4.58189 12 9 12Z"
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M9 1C11.2091 1 13 2.79086 13 5C13 7.20914 11.2091 9 9 9C6.79086 9 5 7.20914 5 5C5 2.79086 6.79086 1 9 1Z"
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
}
