import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@haven/house_rules_dismissed_v1';

export async function getHouseRulesDismissed(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function setHouseRulesDismissed(dismissed: boolean): Promise<void> {
  try {
    if (dismissed) {
      await AsyncStorage.setItem(KEY, 'true');
    } else {
      await AsyncStorage.removeItem(KEY);
    }
  } catch {
    /* ignore */
  }
}
