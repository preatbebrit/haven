import { useMemo } from 'react';

import { Colors } from '@/constants/theme';
import { useThemeContext } from '@/contexts/theme-context';

export function useTheme() {
  const { theme, mode, setMode } = useThemeContext();
  const colors = useMemo(() => Colors[theme], [theme]);
  return { theme, mode, setMode, colors };
}
