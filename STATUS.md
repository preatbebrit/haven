# Haven — Project Status

**Repo:** `github.com/preatbebrit/haven` (branch `main`)
**Last commit:** `d7c6a3d` — Delete-account implementation

## ✅ Done & committed
- Supabase auth (signup, profile trigger, RLS, onboarding) — `5e0f3bf`
- Auth routing race fix — `6499514`
- Post-auth loading animation — `694e7e1`
- Auth init refactor → INITIAL_SESSION-only — `ac0c08c`
- **Per-account lock** — `2caeda1` — safety-verified: Tests 1 (shared-device A→B→A), 2 (every-sign-in challenge), 4 (cold launch), background re-lock all passed
- **Delete-account implementation (server-side, anonymize, audit-logged)** — `d7c6a3d` — implemented per approved plan + ChatGPT review revisions; Edge Function deployed; migration applied; service role key set as function secret. **Test pass paused mid-flight** due to discovery of the data-layer bug below.

## 🔴 Active priority — data-layer architectural chapter (next session)
The codebase stores user-specific data as device-wide AsyncStorage blobs with no per-user keying and no server sync. This is the same pattern as the per-device lock bug we fixed in `2caeda1`, but Claude Code's diagnostic sweep found it applies to ~10 more data types. This is not a bug fix; it's an architectural piece that wasn't built. Affected data types in priority order:
1. **Profile data** (username, pronouns, identity, gender, out status, accepting environment, DOB) — most central; many app surfaces depend on it; the schema columns don't even exist on Supabase yet for most fields
2. **Blocks** — privacy-sensitive
3. **Friend reports** — privacy-sensitive (separate from the report-anonymization designed for delete-account)
4. **Profile shares** (who can see your gallery/prompts/identity) — privacy-sensitive
5. Friends / friend requests / top friends
6. Bio
7. Gallery (also has on-disk files outside AsyncStorage that need cleanup)
8. Prompt answers
9. Notifications-seen state
10. Active chat / chat state (low impact today, real problem when chat ships)
11. Intro carousel (already separately diagnosed)

Next-session work: design what data lives where (device-per-user vs. server-of-record), do the Supabase schema work to add missing columns, build the server-sync pattern (probably starting with profile as the template), then apply per-user namespacing for the device-local pieces. Likely multi-session work.

## 🟡 Blocked on data-layer chapter
- **Delete-account test pass** — can't meaningfully test until profile data actually loads per-user; resume after data-layer work
- **Intro carousel device-wide bug** — same architectural pattern; rolls into the chapter

## 🟡 Queued separately (after architecture)
- Pending-toast not draining from settings sub-screens
- Post-sign-in fade transition polish (plan approved, not implemented)
- Auth-screen keyboard-jitter fix (`app/auth/email.tsx` + `hooks/use-stable-keyboard-height.ts` — pre-existing uncommitted work in tree from a prior session — needs its own focused commit when picked back up)

## 🟡 Noted, smaller follow-ups (not blocking)
- `Jane_o_0` fallback handle (will be addressed naturally as part of profile data-layer work)
- `getCurrentUserId()` always returning `'me'` (relevant when chat ships)
- Soft-delete grace period / undo window (future evolution; reasonable but not MVP-critical)
- Supabase API key deprecation (anon → publishable rename; cosmetic for now)

## 📌 Pre-launch safety checklist
- Turn "Confirm email" back ON in Supabase (currently OFF for testing)
- Real account deletion shipped (commit `d7c6a3d`; verify test pass when data-layer allows)
- Soft-delete window decision
- Profile data sync working end-to-end
- Privacy-sensitive data types (blocks, reports, shares) properly scoped per-user

## Working style notes
Designer, not engineer. Plain language, explicit step-by-step. Verify before commit. Don't bundle separate concerns. Route feel/design decisions to the user, implementation to Claude Code. Safety-relevant decisions for queer-community audience get extra deliberation. Diagnose before fixing.

## Architectural pattern to remember
This codebase was originally built single-user-on-device and the data layer was never updated for multi-user use. Symptom: any feature that holds user-specific state in AsyncStorage tends to leak across accounts on the same device. Fix template exists in `lib/lock-storage.ts` (commit `2caeda1`) — per-user keying like `@haven/<feature>_v2/<userId>/...` plus a one-time migration to drop the legacy device-wide key.