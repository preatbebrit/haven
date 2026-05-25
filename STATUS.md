# Haven — Project Status

**Repo:** `github.com/preatbebrit/haven` (branch `main`)
**Last commit:** `46da963` — Pre-launch: sign-out escape hatch on BootError

## ✅ Done & committed
- Supabase auth (signup, profile trigger, RLS, onboarding) — `5e0f3bf`
- Auth routing race fix — `6499514`
- Post-auth loading animation — `694e7e1`
- Auth init refactor → INITIAL_SESSION-only — `ac0c08c`
- **Per-account lock** — `2caeda1` — safety-verified across the load-bearing tests (Tests 1, 2, 4, background re-lock).
- **Delete-account implementation (server-side, anonymize, audit-logged)** — `d7c6a3d` — implemented per approved plan; Edge Function deployed; migration applied; service role key set as function secret. **Test pass paused mid-flight** due to discovery of the broader data-layer architectural gap.
- STATUS.md introduced — `32717dc`
- **Phase 1, chunk 1** (profile schema split, reserved usernames) — `aa9ffef`
- **Phase 1, chunk 2** (`ProfileState` union, parallel fetch, four-state boot gate) — `b61d7d9`
- **Phase 1, chunk 3** (`complete_onboarding` RPC, settings write-through, validation UX) — `c59ecb7`
- **Phase 1, chunk 4** (cleanup: legacy storage modules deleted, dev-seed pruned, STATUS.md update) — `dc37893`
- **Delete-account verified end-to-end** — `814f2ed` — test pass against post-Phase-1 schema completed; silent-audit-log GRANT bug found and fixed in same commit.
- **Intro carousel device-wide bug resolved** — fixed by Phase 1 (`b61d7d9`); intro_seen is now per-user in profiles_public.
- **Phase 1.1 — ISO date normalization** — `7cbe879` — `date_of_birth` now sent to `complete_onboarding` in ISO 8601 (YYYY-MM-DD) via `lib/date-input.ts:mmddyyyyToIso`, removing the implicit Postgres DateStyle dependency.
- **Phase 1.1 — username step input polish** — `3e63bdf` — fixed placeholder text clipping via explicit lineHeight; eliminated first-keystroke bounce by giving TextInput a fixed height and moving the placeholder to a custom overlay.
- **Onboarding resumability + enforcement** — `09c4b2b`, `c985719`, `af855be`, `45d8512`, `681d922`, `136a0ee` — `onboarding_completed_at` is the authoritative completion signal, replacing implicit `username IS NOT NULL`. Boot gate routes incomplete users to /onboarding; back-trap on step 1 closes the in-session bypass; sign-out link is the only sanctioned exit. Onboarding screen resumes at the persisted step; draft fields hydrate into the form on re-entry. Lock PIN stays local; all other fields persist server-side.
- **Phase 1.1 — strict nullability for `me` / `displayProfile`** — `fe4743e` — empty-string placeholders removed; both fields now properly typed as nullable. Six consumer files updated with early-return null guards. Net code reduction (-31 / +17).
- **Pre-launch — BootError sign-out escape hatch** — `46da963` — sign-out link added below Try Again on BootError. Calls `supabase.auth.signOut({ scope: 'local' })`; auth cascade routes to welcome via boot gate. Same UX pattern as onboarding sign-out link.

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
1. **Profile + bio + intro flag** — shipped (see Phase 1 follow-ups below)
2. Gallery
3. Safety social-graph (blocks, reports, shares — full implementation)
4. Friendships, friend requests, top friends (incl. unfriend cascade for shares)
5. Chat membership + prompt answers
6. Device-local cleanup (notifications-seen, possible UI pointer)

### Phase 1 status — SHIPPED
- Plan ratified after ChatGPT third-party-perspective review. Final architecture: split tables (`profiles_public` + `profiles_private`), `ProfileState` union with explicit fetch-error state, versioned client migration key (`@haven/profile_schema_version`), `complete_onboarding` RPC for cross-table atomic writes, `source` column on `profile_shares` for future flexibility.
- Shipped in four chunks: `aa9ffef`, `b61d7d9`, `c59ecb7`, plus chunk 4 cleanup uncommitted.
- Follow-ups listed below.

## Phase 1 follow-ups

### Pre-launch (must address before real users)
- **Separate dev environment.** Phase 1 migrations ran against `main PRODUCTION` because it's the only Supabase branch. Set up either Supabase branching (Pro plan, ~$25/mo) or a separate `haven-dev` project (free tier) so future migrations get tested somewhere they cannot hurt real data.
- **Username availability check rate-limiting.** The step-username availability check fires a direct `profiles_public` query per ~400ms of typing. Pre-launch, move behind an RPC with per-user rate-limiting when general rate-limiting is wired up.
- **`email.tsx` loading overlay polish.** The opaque white blocker + spinner during sign-in is heavy-handed. Replace with a lighter loading state (button text change, small in-button spinner). Bundle this fix with the in-progress auth-keyboard work commit; do not touch `email.tsx` in isolation.

### Phase 1.1 (small follow-ups, no blocker)
- **Centralize profile field → display mapping.** Logic that turns raw `out_status` into "Out" / "Sort-of out" / "Not out" pill labels lives in `current-user-context.tsx` mixed with other tag construction. Extract to a dedicated `lib/profile-display.ts` helper when a second consumer materializes.
- **`validate_username(text)` SQL function extraction.** `complete_onboarding` currently inlines the length / format / reserved validation. When a username-change RPC is added (e.g., for a future settings-rename flow), extract the validation block into `public.validate_username(uname text)` and call from both.
- **dev-seed `clearEverything` doesn't reset server-side profile fields.** Currently only clears local mocks (friends, gallery, etc.). Post-Phase-1, profile data lives in Supabase but `clearEverything` doesn't touch it. Add Supabase updates to null out `profiles_public.bio`, `profiles_public.intro_seen`, and the seven fields in `profiles_private` when "Reset everything" is invoked. Worth doing whenever the dev-tools get their next pass.
- **Username step probe-skip on retreat.** When the user retreats to step 1 with a persisted username in the draft, the input pre-fills but the Next button is briefly inactive (~400ms) while the availability probe re-runs. The check is redundant — the username was already confirmed available when it was first typed. Skip the probe when `local === username` (i.e., the value came from the saved draft).

### Future phases (architectural, larger scope)
- **Lookalike-character flagging for usernames.** Phase 4+ work: contextual warnings when displaying users to people who have visually similar handles in their friends list (e.g., `0`/`O`, `1`/`l`/`I`). Plan §11 explicitly defers this; Phase 1 accepts the residual impersonation risk.
- **Gallery and prompt-answer cloud sync.** Currently device-local via `lib/gallery-storage` and `lib/prompt-answer-storage`. Multi-device users see different content per device. Migrate images to Supabase Storage and slot metadata to new tables when tackling cross-device sync.
- **Friends and chat persistence to backend.** No friends / chats tables exist in Supabase yet. All friend cards and chat data are mocked locally. Whole social/communication layer needs dedicated phase planning.

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