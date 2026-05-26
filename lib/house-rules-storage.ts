import AsyncStorage from '@react-native-async-storage/async-storage';

// Key is namespaced per user so a second account on the same device starts
// fresh — without this, dismissing the tile as user A would hide it for
// user B too, since AsyncStorage persists across sign-outs.
const keyFor = (userId: string) => `@haven/house_rules_dismissed_v1/${userId}`;

export async function getHouseRulesDismissed(userId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function setHouseRulesDismissed(userId: string, dismissed: boolean): Promise<void> {
  try {
    if (dismissed) {
      await AsyncStorage.setItem(keyFor(userId), 'true');
    } else {
      await AsyncStorage.removeItem(keyFor(userId));
    }
  } catch {
    /* ignore */
  }
}
