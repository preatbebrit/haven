import Animated, {
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size?: number;
  color?: string;
  /**
   * Horizontal pupil offset in viewBox units (0 = default per Figma, which
   * already has the iris/pupil positioned to the left). Positive moves the
   * eye to the right, negative further left. Sweep range ~0–35.
   */
  pupilX?: SharedValue<number>;
};

// Inlined from Figma node 606:13758. Three shapes:
//   1. Almond outline (stroke 14.33)
//   2. Iris circle, default cx=71, cy=78.8, r=30.1 (stroke 11.47)
//   3. Filled pupil, default cx=71, cy=78.8, r=14.33
// Iris + pupil share the same animated cx so they translate together.
const IRIS_BASE_CX = 70.9994;
const IRIS_CY = 78.8333;
const IRIS_R = 30.1;
const PUPIL_R = 14.3333;

export function EyeIcon({ size = 172, color = Colors.black, pupilX }: Props) {
  const irisProps = useAnimatedProps(() => ({
    cx: IRIS_BASE_CX + (pupilX?.value ?? 0),
  }));
  const pupilProps = useAnimatedProps(() => ({
    cx: IRIS_BASE_CX + (pupilX?.value ?? 0),
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 172 172" fill="none">
      {/* Almond outline */}
      <Path
        d="M150.5 86C150.5 86 121.622 129 86 129C50.3776 129 21.5 86 21.5 86C21.5 86 50.3776 43 86 43C121.622 43 150.5 86 150.5 86Z"
        stroke={color}
        strokeWidth={14.3333}
        fill="none"
      />
      {/* Iris */}
      <AnimatedCircle
        animatedProps={irisProps}
        cy={IRIS_CY}
        r={IRIS_R}
        stroke={color}
        strokeWidth={11.4667}
        fill="none"
      />
      {/* Pupil */}
      <AnimatedCircle
        animatedProps={pupilProps}
        cy={IRIS_CY}
        r={PUPIL_R}
        fill={color}
      />
    </Svg>
  );
}
