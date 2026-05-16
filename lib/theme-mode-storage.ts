import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@haven/theme_mode_v1';

export type ThemeMode = 'light' | 'dark' | 'system';

export const DEFAULT_THEME_MODE: ThemeMode = 'system';

function isMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export async function getThemeMode(): Promise<ThemeMode> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return isMode(raw) ? raw : DEFAULT_THEME_MODE;
  } catch {
    return DEFAULT_THEME_MODE;
  }
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
}

export async function clearThemeMode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
