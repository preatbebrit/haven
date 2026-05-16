import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearGallery } from '@/lib/gallery-storage';

// Wipes every persisted slice of user state so the next account starts
// from a clean slate. Used by sign-out, delete-account, and the welcome
// "Begin" → auth flow (which today is a sign-up).
//
// Note: in-memory React contexts still hold the prior state after this
// resolves. Callers also need to reset each provider — see
// `useResetAccount`.
export async function wipeAllLocalData(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const havenKeys = keys.filter((k) => k.startsWith('@haven/'));
    if (havenKeys.length > 0) {
      await AsyncStorage.multiRemove(havenKeys);
    }
  } catch {
    /* non-fatal */
  }
  // Gallery owns image files outside AsyncStorage; the multiRemove above
  // drops the index but not the on-disk files.
  await clearGallery();
}
