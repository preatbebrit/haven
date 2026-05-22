import AsyncStorage from '@react-native-async-storage/async-storage';

// Versioned migration runner for client-side AsyncStorage related to the
// profile data layer. Pairs with the Supabase migration at
// supabase/migrations/20260521120000_profile_phase1.sql.
//
// Versions:
//   v0 (implicit) — pre-Supabase profile/bio/intro lived as device-wide
//                   AsyncStorage blobs under the legacy keys below.
//   v1            — those fields are server-of-record. Drop the legacy
//                   blobs so the new code never reads stale local data.
//
// Future migrations stack here as `if (current < N) await migrateToVN();`
// blocks above the version-write line, exactly like lib/lock-storage.ts's
// v2 migration template (commit 2caeda1).
const PROFILE_SCHEMA_VERSION_KEY = '@haven/profile_schema_version';
const CURRENT_PROFILE_SCHEMA_VERSION = 1;

// Legacy AsyncStorage keys from the pre-Supabase flow. Listed inline (not
// imported from lib/profile-storage.ts / lib/bio-storage.ts / lib/intro-storage.ts)
// so chunk 4 can delete those modules without breaking this migration.
//
// Confirmed against the source files:
//   @haven/profile_v1        — lib/profile-storage.ts
//   @haven/profile_bio_v1    — lib/bio-storage.ts
//   @haven/has_seen_intro_v1 — lib/intro-storage.ts
const LEGACY_KEYS_V0 = [
  '@haven/profile_v1',
  '@haven/profile_bio_v1',
  '@haven/has_seen_intro_v1',
];

async function readVersion(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_SCHEMA_VERSION_KEY);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

// v0 → v1: profile/bio/intro now live on Supabase columns (profiles_public.bio,
// profiles_public.intro_seen, and the profile fields on profiles_private).
// multiRemove is idempotent on missing keys, so this is safe to run on a
// fresh install — it just removes nothing.
async function migrateToV1(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(LEGACY_KEYS_V0);
  } catch (e) {
    // Non-fatal. The legacy keys may already be gone. Worst case the stale
    // values remain but are never read (the new code reads from Supabase),
    // and the next launch will retry the multiRemove anyway.
    console.warn('[profile-sync] v0→v1 multiRemove failed (non-fatal)', e);
  }
}

/**
 * Best-effort runner. Called once from AuthProvider's mount effect before
 * the first profile fetch. Migration failures are logged but never thrown —
 * crashing boot on a legacy-cleanup hiccup would be much worse than leaving
 * a stale AsyncStorage key sitting around (it's never read by new code).
 */
export async function runProfileSchemaMigrations(): Promise<void> {
  try {
    const current = await readVersion();
    if (current >= CURRENT_PROFILE_SCHEMA_VERSION) return;

    if (current < 1) await migrateToV1();

    await AsyncStorage.setItem(
      PROFILE_SCHEMA_VERSION_KEY,
      String(CURRENT_PROFILE_SCHEMA_VERSION),
    );
  } catch (e) {
    console.warn('[profile-sync] migration runner failed (non-fatal)', e);
  }
}
