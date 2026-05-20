import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearGallery } from '@/lib/gallery-storage';

// Crash-recovery tombstone. Set BEFORE the delete-account network call
// fires, consumed on next launch by AuthProvider via consumePendingWipe.
// Sits inside the @haven/* namespace so wipeAllLocalData removes it as
// part of the wipe — no explicit clear needed on the happy path.
const PENDING_WIPE_KEY = '@haven/pending_local_wipe_v1';

// Wipes every persisted slice of user state so the next account starts
// from a clean slate.
//
// UX cleanup, not security: the access-control guarantee comes from
// supabase.auth.signOut invalidating the session in SecureStore (and
// scope:'global' revoking refresh tokens server-side). This function
// only ensures the next session starts from a known-empty state.
//
// In-memory React contexts still hold the prior state after this
// resolves. Callers that need an in-memory reset have two options:
//   (a) call supabase.auth.signOut() first — the AuthProvider session=
//       null cascade resets userId-keyed contexts (LockProvider in
//       particular) for free.
//   (b) trigger explicit context reloads (see useResetAccount /
//       useDeleteAccount).
// Either is fine; both is belt-and-suspenders and what useDeleteAccount
// does.
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

// Marks that a wipe is owed. The delete-account flow calls this before
// the Edge Function so a crash anywhere between the server delete and
// the local wipe is recoverable on next launch.
export async function markPendingWipe(): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_WIPE_KEY, '1');
  } catch {
    /* non-fatal — worst case the wipe just happens at next sign-out */
  }
}

// Reads the tombstone and, if set, runs wipeAllLocalData. The flag is
// itself wiped by wipeAllLocalData (it lives under @haven/*). Returns
// true iff a wipe was performed, so callers can chain follow-up actions
// (e.g. force a signOut to invalidate stale tokens).
export async function consumePendingWipe(): Promise<boolean> {
  let pending = false;
  try {
    pending = (await AsyncStorage.getItem(PENDING_WIPE_KEY)) === '1';
  } catch {
    return false;
  }
  if (!pending) return false;
  await wipeAllLocalData();
  return true;
}
