import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';

type Props = {
  width?: number;
  height?: number;
  color?: string;
};

// Inlined from /House Illo.svg — hand-drawn house used on the House Rules
// home tile. Each shape carries its own -5.0763° rotation, so the SVG renders
// already tilted.
export function HouseIllustration({
  width = 98,
  height = 90,
  color = Colors.skyBlue,
}: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 98 90" fill="none">
      {/* body */}
      <Rect
        x={21.6978}
        y={36.8526}
        width={52.1791}
        height={50.4591}
        transform="rotate(-5.0763 21.6978 36.8526)"
        stroke={color}
        strokeWidth={2}
      />
      {/* roof */}
      <Path
        d="M83.7596 30.9509L11.544 37.3658L45.0857 5.27112L83.7596 30.9509Z"
        stroke={color}
        strokeWidth={2}
      />
      {/* door */}
      <Rect
        x={43.2447}
        y={65.5882}
        width={14.3397}
        height={19.9296}
        transform="rotate(-5.0763 43.2447 65.5882)"
        stroke={color}
        strokeWidth={2}
      />
      {/* left window */}
      <Rect
        x={27.6764}
        y={45.8187}
        width={13.4797}
        height={13.4797}
        transform="rotate(-5.0763 27.6764 45.8187)"
        stroke={color}
        strokeWidth={2}
      />
      <Path d="M34.377 45.0828L35.5944 58.7886" stroke={color} strokeWidth={2} />
      <Path d="M28.1348 52.5445L42.0547 51.3079" stroke={color} strokeWidth={2} />
      {/* right window */}
      <Rect
        x={55.9439}
        y={43.3077}
        width={13.4797}
        height={13.4797}
        transform="rotate(-5.0763 55.9439 43.3077)"
        stroke={color}
        strokeWidth={2}
      />
      <Path d="M62.6445 42.5718L63.862 56.2776" stroke={color} strokeWidth={2} />
      <Path d="M56.4023 50.0334L70.3223 48.7969" stroke={color} strokeWidth={2} />
      {/* door knob */}
      <Circle
        cx={54.558}
        cy={75.4507}
        r={1.50497}
        transform="rotate(-5.0763 54.558 75.4507)"
        fill={color}
      />
    </Svg>
  );
}
