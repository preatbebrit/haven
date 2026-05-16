import Svg, { Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

type Props = {
  size?: number;
  color?: string;
};

// Figma node 88:3679 — reply arrow: left-pointing arrowhead with an upward hook.
export function ReplyIcon({ size = 24, color = Colors.black }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5.29289 9.29289C4.90237 9.68342 4.90237 10.3166 5.29289 10.7071L11.6569 17.0711C12.0474 17.4616 12.6805 17.4616 13.0711 17.0711C13.4616 16.6805 13.4616 16.0474 13.0711 15.6569L7.41421 10L13.0711 4.34315C13.4616 3.95262 13.4616 3.31946 13.0711 2.92893C12.6805 2.53841 12.0474 2.53841 11.6569 2.92893L5.29289 9.29289ZM18 10H19V9H18V10ZM6 10V11H18V10V9H6V10ZM18 10H17V18H18H19V10H18Z"
        fill={color}
      />
    </Svg>
  );
}
