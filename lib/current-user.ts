/**
 * Stable id for the current user, for non-React callers (storage shims,
 * friend graph, dev seeders). The full user profile — handle, pronouns,
 * avatar — is owned by CurrentUserContext (see contexts/current-user-context.tsx).
 *
 * Phase A keeps `getCurrentUserId()` returning the seeded `'me'` id so the
 * existing mock chat/friend/storage data continues to render after sign-in.
 * The real Supabase auth id is captured via `setCurrentUserId()` by
 * AuthProvider and exposed via `getAuthUserId()` for Supabase queries that
 * need the real foreign key (e.g. profiles.id = auth.uid()).
 *
 * Phase B will migrate storage shims off the `'me'` seed and flip
 * `getCurrentUserId()` to return the auth id.
 */
let _authId: string | null = null;

export function setCurrentUserId(id: string | null): void {
  _authId = id;
}

export function getCurrentUserId(): string {
  return 'me';
}

export function getAuthUserId(): string | null {
  return _authId;
}
