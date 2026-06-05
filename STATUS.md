# Haven — Project Status

**Repo:** `github.com/preatbebrit/haven` (branch `main`)
**Last commit:** `25c8970` — Sign-out: wipe device AsyncStorage and route direct supabase.auth.signOut calls through the central auth helper

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
- **Design system compliance — sign-out links + visual polish** — `f611dde` — three sign-out/toggle labels switched from ad-hoc fontFamily + fontSize to `TextStyle.bodyBold` preset; sign-out link in onboarding now only renders on step 1; misc spacing / underline tweaks.
- **Phase 1.1 — username probe-skip on retreat** — `2f6c4bb` — when the typed value matches the persisted username in context (resume or retreat case), short-circuit the availability probe and set status to 'available' synchronously. Saves the 400ms debounce delay where the Next button was inactive.
- **Fix Rules of Hooks violation in null-guarded components** — `50b35e3` — commit `fe4743e` introduced a hook-order bug by placing early-return null guards after some hooks but before others. Six files affected; all fixed by moving the null guard immediately before the JSX return and making intermediate hooks (useMemo, useEffect) handle the null case internally. Caught when ProfileScreen crashed on sign-out with "Rendered fewer hooks than expected."
- **Phase 1.1 — centralize out_status display mappings** — `cb1c85c` — extracted out_status display strings to `lib/profile-display.ts` as `OUT_STATUS_TAG_LABELS` (identity-tag form: 'Out' / 'Not out' / 'Sort-of out') and `OUT_STATUS_ANSWER_LABELS` (settings-answer form: 'Yes' / 'No' / 'Sort of'). Both forms preserved as distinct named exports. Five files updated to import from the new location. Also fixed a mock-friends.ts gap where no member had 'Sort-of out' as an identity tag, which masked a latent measurement race in IdentityPillRow when the current user's status was 'sort-of'.
- **Pre-launch — email auth keyboard + loading polish** — `976c2b1` — replaced iOS KeyboardAvoidingView with the `useStableKeyboardHeight` hook to eliminate jitter from QuickType autocorrect bar frame changes. Footer now lifts smoothly above the keyboard once on open and holds steady. Also removed the full-screen white-translucent loading overlay during sign-in; button-level "Signing in..." text + body pointerEvents disabling already provide adequate loading feedback.
- **House Rules — Haven manifesto** — `eee282d` — 5-page informational experience introducing new users to Haven's values. Dismissible tile on chat selection (state in `lib/house-rules-storage`); persistent entry in settings for future reference. No acceptance gate. New screen `app/house-rules.tsx` plus 12 supporting components and a shared `HeartIcon` extraction.
- **Onboarding intro carousel rebuild** — `17b0b5a` — animated SVG illustrations replacing static tutorial PNGs. Added `react-native-svg-transformer` so `.svg` files can be imported as React components; metro config + svg.d.ts type declaration added. Each of the three intro slides is now its own active-aware component (`IntroCarousel1/2/3`) with reanimated entry/loop animations.
- **House rules animation tuning** — `a83ceb1` — per-rule animation timing adjustments across all 5 rule pages, including a global speed multiplier on rule-01. Tile, screen container, and storage/transition helpers polished to match.
- **step-out-status phase animations** — `9cbc310` — the three internal phases (out / environment / resources) now slide + fade between each other instead of swapping instantly. Matches the parent onboarding step animation timing.

## 🔴 Active priority — real chat launch (Phase 3 partial + Phase 5)

After honest review, the app today only has real backend for auth + profile. Every social feature (chats, members, messages, friends, gallery viewing) is mocked device-local data. Launching a TestFlight beta of this would ship a profile-editor, not a community app. Decision: skip Pride launch, build real chat first, ship in mid-July to mid-August.

### v1 launch scope
- Curated chat prompts (admin-written, stored in `chat_prompts`)
- Algorithmic group creation + expiry (Supabase cron job)
- Chat groups with members, 7-day lifecycle, max-seat enforcement
- Text + GIF (Giphy) messages
- Single-level replies (`reply_to_message_id` on messages)
- Single-reaction (heart) on messages
- Block + report safety primitives (Phase 3 partial)
- Real users in chat selection (no mocked members)

### Deferred for v2+
- Friends + friend-status badges (Phase 4 entirely deferred)
- Top friends, friend requests
- User-created chat prompts
- Multiple reaction types
- Voice / image messages
- Gallery cloud sync (Phase 2 — gallery remains device-local; owner-only is fine, no cross-user leak)
- Notifications backend

### Sequencing (estimated 4-6 weeks)
1. Apple Developer Program signup (in parallel, has wait time)
2. Curate 50-100 chat prompts (product work, in parallel)
3. Decide chat lifecycle parameters (7-day duration? max seats? what happens at expiry — delete vs archive)
4. **Phase 3 partial** — `user_blocks`, `user_reports` tables, RLS, basic UI. ~3-5 days.
5. **Phase 5 schemas** — `chat_prompts`, `chat_groups`, `chat_members`, `chat_messages`, `chat_message_reactions`. RLS, RPCs (`join_chat`, `leave_chat`, `send_message`), realtime subscriptions. ~5-7 days.
6. **Phase 5 cron job** — group creation + expiry via Supabase pg_cron. ~2-3 days.
7. **Phase 5 client work** — replace mocked chat with real. Chat selection, chat detail, member list, message composer, reply UI, heart UI, block/report UI. ~7-10 days.
8. Polish, edge cases, error states. ~3-5 days.
9. TestFlight build, internal testing.
10. App Store submission and review.

### Mechanics — decided

**Chat lifecycle:**
- Chats are open-ended (no fixed expiry on the group itself)
- Each user has a 7-day membership window; auto-removed at end of 7 days
- Users can also leave manually
- Max 5 seats per chat

**Rate limits (rolling 24-hour window per user):**
- 1 leave per 24 hours
- Joins unlimited
- Block-target leaves (leaving a chat containing someone the user has blocked) exempt from rate limit
- Auto-removal at 7 days does NOT count as a leave

**Message visibility (RLS-enforced):**
- A user only sees messages sent during their membership window (`message.sent_at` between their `joined_at` and `left_at`)
- Past members can still see messages from their window (read-only) via the chat detail screen until v1 ships a past-chats archive
- New joiners can't read history from before they joined

**Blocks:**
- When A blocks B, both remain in any current shared chat (block doesn't disrupt active chats)
- A can leave the shared chat without counting toward rate limit (block-target leave)
- A's chat selection page no longer shows chats containing B (forward-only protection)
- B's chat selection page no longer shows chats containing A
- B sees A's profile as "this profile doesn't exist"
- A still sees B's profile normally (A can unblock from settings)
- Unblock is via a "blocked users" list in settings

**Reports:**
- Separate from blocks — report is a moderation queue item, block is a personal filter
- v1 may have minimal/manual review (you, eventually a team)

**Messages support:**
- Plain text
- Giphy GIFs (Giphy SDK on client, store Giphy id + metadata in `gif_metadata` jsonb)
- Single-level replies (`reply_to_message_id`, parent is quoted/previewed in UI)
- One reaction type (heart), unique per user per message

**Group creation cron:**
- Hourly cron via Supabase pg_cron
- Threshold-based: if active groups with open seats < target_minimum, create more
- Tuning parameters configurable in a `chat_config` table (or constants): target_minimum_open_groups, max_creates_per_run, prompt-selection strategy (random vs round-robin vs weighted)
- Old groups (no active members) eventually archived; v1 may just leave them

**Past chats archive view:**
- Deferred for v1 — no UI for accessing chats you've been removed from
- Decision to be revisited if user feedback says they miss the history

### What stays mocked through v1
- Gallery (owner-only viewing, device-local, no leak since gallery is self-only)
- Friends-related UI surfaces — these get hidden entirely from the client (no friend badges, no add-friend buttons, no friend lists) even though the data layer never gets touched

## 📚 Architectural reference (long-term)

This section captures the long-term data architecture plan ratified earlier. The active priority section above reflects the current sequencing for the v1 launch; phase numbers here are the canonical definitions of each phase.

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

### Phase 1.1 (small follow-ups, no blocker)
- **`validate_username(text)` SQL function extraction.** `complete_onboarding` currently inlines the length / format / reserved validation. When a username-change RPC is added (e.g., for a future settings-rename flow), extract the validation block into `public.validate_username(uname text)` and call from both.
- **dev-seed `clearEverything` doesn't reset server-side profile fields.** Currently only clears local mocks (friends, gallery, etc.). Post-Phase-1, profile data lives in Supabase but `clearEverything` doesn't touch it. Add Supabase updates to null out `profiles_public.bio`, `profiles_public.intro_seen`, and the seven fields in `profiles_private` when "Reset everything" is invoked. Worth doing whenever the dev-tools get their next pass.
- **IdentityPillRow measurement race when only one pill key changes.** The pill row uses an opacity:0 → onLayout-measure → opacity:1 pattern, where a useEffect resets `measuring=true` whenever matched/unmatched keys change. For typical out_status transitions, many pill indices shift in the combined `[...matched, ...unmatched]` array, so many pills get fresh React keys → fresh onLayout fires → measurement completes. But when only one pill key changes (e.g., a single-tag transition with no index cascade), RN doesn't fire onLayout (no layout change), `measuring` stays true forever, and the whole row stays at opacity 0. Currently masked by the symmetric mock data in `constants/mock-friends.ts` (fixed in commit `cb1c85c`) but the underlying race could resurface when real friend identity data lands in Phase 4+. Worth refactoring to a synchronous measurement strategy or resetting `measuring` correctly on partial key changes.

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