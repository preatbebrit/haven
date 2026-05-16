import Svg, { Circle } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export function DotsIcon({ size = 24, color = '#000000' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={6} cy={12} r={2} fill={color} />
      <Circle cx={12} cy={12} r={2} fill={color} />
      <Circle cx={18} cy={12} r={2} fill={color} />
    </Svg>
  );
}
