import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  filled?: boolean;
};

export function StarIcon({ size = 20, color = '#000000', filled = false }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.5l2.95 6.18 6.8.99-4.92 4.8 1.16 6.78L12 17.96l-6 3.29 1.16-6.78L2.25 9.67l6.8-.99L12 2.5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}
