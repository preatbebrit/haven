import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@haven/profile_bio_v1';

export async function getBio(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setBio(value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, value);
  } catch {
    /* ignore */
  }
}

export async function clearBio(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
