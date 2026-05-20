# Haven — Project Status

**Repo:** `github.com/preatbebrit/haven` (branch `main`)
**Last commit:** `32717dc` — Add STATUS.md (this file's first version)

## ✅ Done & committed
- Supabase auth (signup, profile trigger, RLS, onboarding) — `5e0f3bf`
- Auth routing race fix — `6499514`
- Post-auth loading animation — `694e7e1`
- Auth init refactor → INITIAL_SESSION-only — `ac0c08c`
- **Per-account lock** — `2caeda1` — safety-verified across the load-bearing tests (Tests 1, 2, 4, background re-lock).
- **Delete-account implementation (server-side, anonymize, audit-logged)** — `d7c6a3d` — implemented per approved plan; Edge Function deployed; migration applied; service role key set as function secret. **Test pass paused mid-flight** due to discovery of the broader data-layer architectural gap.
- STATUS.md introduced — `32717dc`

## 🔴 Active priority — data-layer architectural chapter (in progress)
The codebase was originally built single-user-on-device and the data layer was never updated for multi-user use. We've now done the architectural planning: every data type has a deliberate home, the work is sequenced into 6 phases, and Phase 1 is mid-planning.

### Architectural map — decided
Server-of-record on Supabase: profile data (pronouns, identity tags, gender, out status, accepting environment, DOB), bio, gallery (metadata + Supabase Storage for images), blocks, friend reports, profile shares, friendships, friend requests, top friends, prompt answers, chat membership, intro-seen flag.

Device-local, per-user keyed (lock-fix template): notifications-seen state, last-viewed-chat UI pointer (if kept).

Device-wide, no change: theme mode.

### Architectural defaults & posture
- **Server-by-default**, with deliberate exceptions for purely-personal device-level UI state.
- **Private-by-default identity fields**, opt-in to share. Username and bio are universal exceptions.
- **Structural privacy enforcement** for identity-sensitive fields — split tables (`profiles_public` + `profiles_private`) rather than view-based gating. Identity data exists only in tables cross-user queries cannot read; cross-user reads of private fields go through a SECURITY DEFINER RPC scoped by share rows.
- **Sharing is per-field, per-recipient.** Two UIs (Friend Status panel + own-profile per-friend list) both write to the same `profile_shares` table. Identity tags / demographic fields get only the Friend Status UI; gallery and prompts get both surfaces.
- **Shares die with friendship.** Phase 4's unfriend operation cascade-deletes share rows; Phase 1's RLS is designed assuming share-row existence implies an active friendship.
- **Chat count and friend count are computed on read** (no denormalized columns). `chat_count` is lifetime — `chat_members` rows persist past chat expiry as historical record. `friend_count` is current.

### Phase sequence
1. **Profile + bio + intro flag** (active — plan revised, awaiting fresh-eyes review)
2. Gallery
3. Safety social-graph (blocks, reports, shares — full implementation)
4. Friendships, friend requests, top friends (incl. unfriend cascade for shares)
5. Chat membership + prompt answers
6. Device-local cleanup (notifications-seen, possible UI pointer)

### Phase 1 status — REVISED PLAN AWAITING REVIEW
- Claude Code produced an initial plan; reviewed against feedback from ChatGPT (third-party perspective).
- Major revision: **split tables (`profiles_public` + `profiles_private`) instead of `profile_view`** for structural privacy enforcement.
- Other revisions folded in: explicit fetch-error state in ProfileState union (no more routing existing users to onboarding on a network blip), `source` column on `profile_shares` for future flexibility, versioned migration key (`@haven/profile_schema_version`) instead of boolean tombstone, `complete_onboarding` RPC added by Claude Code for cross-table atomicity.
- **Revised plan is in this conversation, awaiting careful tomorrow-with-fresh-eyes review before implementation approval.**
- Open questions in the plan to be answered tomorrow: backfill semantics for existing accounts, `profile_shares.source` initial vocabulary, error screen copy, RPC vs parallel updates for onboarding, all-null vs upload-legacy backfill.

## 🟡 Blocked on data-layer chapter
- **Delete-account test pass** — resume after Phase 1 lands (profile data needs to actually load per-user before delete-account can be meaningfully tested).
- **Intro carousel device-wide bug** — rolled into Phase 1 (intro_seen becomes a server column).

## 🟡 Queued separately
- Pending-toast not draining from settings sub-screens.
- Post-sign-in fade transition polish (plan approved, not implemented).
- Auth-screen keyboard-jitter fix (`app/auth/email.tsx` + `hooks/use-stable-keyboard-height.ts` — pre-existing uncommitted work in tree).

## 🟡 Noted, smaller follow-ups (not blocking)
- `Jane_o_0` fallback handle (addressed naturally in Phase 1).
- `getCurrentUserId()` always returning `'me'` (becomes relevant when chat ships).
- Soft-delete grace period / undo window for account deletion.
- Supabase API key deprecation (anon → publishable rename; cosmetic).
- `user_preferences` table — future refactor when there's a second preference beyond `intro_seen` to absorb.
- Unfriending product details (notification, re-friending semantics, blocking interaction).
- Moderation tooling — reports are collecting data; nobody currently reads them.

## 📌 Pre-launch safety checklist
- Turn "Confirm email" back ON in Supabase (currently OFF for testing).
- Real account deletion shipped (commit `d7c6a3d`; verify test pass after Phase 1).
- Soft-delete window decision.
- Profile data sync working end-to-end.
- Privacy-sensitive data types (blocks, reports, shares) properly scoped per-user with airtight RLS.
- Moderation tooling exists for reports to actually be acted on.
- Honest data-handling disclosure language reflects what actually lives on the server.

## Working style notes
Designer, not engineer. Plain language, explicit step-by-step. Verify before commit. Don't bundle separate concerns. Route feel/design decisions to the user, implementation to Claude Code. Safety-relevant decisions for queer-community audience get extra deliberation. Diagnose before fixing. Reviews from any source (AI or human) are input to evaluate, not instructions to follow — the user decides.

## Architectural pattern to remember
This codebase was originally built single-user-on-device and the data layer was never updated for multi-user use. Symptom: any feature that holds user-specific state in AsyncStorage tends to leak across accounts on the same device. Lock fix template (commit `2caeda1`, `lib/lock-storage.ts`) shows the per-user keying pattern for device-local data. The broader server-side architecture is being built out in the data-layer chapter (active priority above).

## Privacy posture
Haven's architecture treats user data as if it were going to leak, and designs to make leaks structurally impossible rather than procedurally unlikely. Identity-sensitive fields live in tables cross-user queries cannot read at all. RLS is airtight, not aspirational. The trade-off accepted consciously: more complex schema and queries, in exchange for "impossible to leak" rather than "probably won't leak."