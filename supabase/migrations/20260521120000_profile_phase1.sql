-- ============================================================================
-- Phase 1: profile data → Supabase (split tables + shares skeleton)
--
-- Companion to the Phase 1 Plan — Final Revised v3 (see conversation history /
-- project doc). Implements §7.1 steps 1–14 in a single transaction so a
-- half-migrated state is impossible. The most dangerous half-state would be
-- the profiles → profiles_public rename landing without the RLS/RPC/trigger
-- updates that depend on it — auth would break for every existing user.
--
-- Step order:
--   1. RENAME profiles → profiles_public (guarded)
--   2. ADD COLUMN bio, intro_seen, updated_at to profiles_public
--   3. CREATE TABLE profiles_private + backfill (ON CONFLICT DO NOTHING)
--   4. CREATE TABLE profile_shares + (recipient_id, field) index
--   5. RLS enable + policies on profiles_public, profiles_private, profile_shares
--   6. GRANTs / REVOKEs
--   7. CREATE TABLE reserved_usernames + RLS + GRANT + seed 24 words
--   8. Pre-flight notices: format violations, case-insensitive duplicates,
--      reserved-word matches (grandfathered), existing-constraint name sanity
--   9. DROP existing username UNIQUE constraint; CREATE functional unique index
--      on lower(username); ADD format CHECK constraint
--  10. CREATE OR REPLACE handle_new_user — inserts into both tables
--  11. CREATE OR REPLACE complete_onboarding — full validation per §11.6
--  12. CREATE OR REPLACE get_shared_private_fields — anchor + LEFT JOIN
--  13. CREATE OR REPLACE get_profile_metrics — stub returning (0, 0)
--  14. CREATE OR REPLACE delete_user_data — extended for profile_shares,
--      profiles_private, profiles_public
-- ============================================================================

begin;

-- ── Step 1 ──────────────────────────────────────────────────────────────────
-- RENAME profiles → profiles_public. Idempotent: no-op on re-runs.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  )
  and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles_public'
  )
  then
    alter table public.profiles rename to profiles_public;
  end if;
end $$;


-- ── Step 2 ──────────────────────────────────────────────────────────────────
-- Add the universally-visible columns. The pre-existing UNIQUE constraint on
-- username (auto-named, typically profiles_username_key) is dropped and
-- replaced by a case-insensitive functional unique index at step 9; step 8
-- prints its actual name as a sanity check.
alter table public.profiles_public
  add column if not exists bio        text check (bio is null or length(bio) <= 150),
  add column if not exists intro_seen boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();


-- ── Step 3 ──────────────────────────────────────────────────────────────────
-- profiles_private holds the privacy-gated identity fields. PK-is-also-FK to
-- profiles_public enforces 1:1 structurally and cascades on user deletion.
create table if not exists public.profiles_private (
  id                    uuid primary key references public.profiles_public(id) on delete cascade,
  date_of_birth         date,
  gender_id             text,
  pronoun_preset        text,
  pronouns_custom       text,
  out_status            text check (out_status in ('yes', 'no', 'sort-of') or out_status is null),
  accepting_environment text,
  identity_tags         text[] not null default '{}',
  updated_at            timestamptz not null default now()
);

-- Backfill: every existing public row gets a paired private row with
-- all-null/default values. Solo-dev test data per the plan's locked answer —
-- no legacy-upload logic.
insert into public.profiles_private (id)
select id from public.profiles_public
on conflict do nothing;


-- ── Step 4 ──────────────────────────────────────────────────────────────────
-- profile_shares: per-(sharer, recipient, field) directional rows. Phase 1
-- writes nothing here; Phase 3 builds the share UI; Phase 4 wires the
-- unfriend cascade. The `source` column is forward-looking (current writes
-- will all be 'friend' since shares only exist between friends in Phase 3).
--
-- Index strategy: the PK (sharer_id, recipient_id, field) is a btree and
-- already serves prefix lookups on (sharer_id) and (sharer_id, recipient_id) —
-- including the six EXISTS subqueries inside get_shared_private_fields and
-- the Phase 4 unfriend cascade's two-column lookup. Do NOT add an explicit
-- (sharer_id, recipient_id) index — it would be redundant. The secondary
-- (recipient_id, field) index below serves the inverse "what's been shared
-- with me" pattern (Phase 3 UI).
create table if not exists public.profile_shares (
  sharer_id    uuid not null references public.profiles_public(id) on delete cascade,
  recipient_id uuid not null references public.profiles_public(id) on delete cascade,
  field        text not null check (field in (
                 'pronouns', 'gender_id', 'out_status',
                 'accepting_environment', 'identity_tags', 'date_of_birth',
                 'gallery', 'prompts'
               )),
  source       text not null default 'friend' check (source in (
                 'friend',   -- created by an explicit user toggle while friends
                 'manual',   -- reserved: future admin/manual provenance
                 'group',    -- reserved: shared by virtue of group membership
                 'default'   -- reserved: created by a default-on-accept policy
               )),
  shared_at    timestamptz not null default now(),
  primary key (sharer_id, recipient_id, field),
  check (sharer_id <> recipient_id)
);

create index if not exists profile_shares_recipient_field_idx
  on public.profile_shares (recipient_id, field);


-- ── Step 5 ──────────────────────────────────────────────────────────────────
-- RLS + policies. Drop-and-recreate each policy so re-runs are idempotent.

-- profiles_public: structurally readable by any authenticated user. Writes
-- are owner-only. No DELETE policy — deletion path is delete_user_data().
alter table public.profiles_public enable row level security;

drop policy if exists profiles_public_select_all on public.profiles_public;
create policy profiles_public_select_all on public.profiles_public
  for select to authenticated using (true);

drop policy if exists profiles_public_insert_self on public.profiles_public;
create policy profiles_public_insert_self on public.profiles_public
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists profiles_public_update_own on public.profiles_public;
create policy profiles_public_update_own on public.profiles_public
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);


-- profiles_private: structurally owner-only. Cross-user reads flow through
-- get_shared_private_fields (SECURITY DEFINER), which is the single
-- controlled gateway. No DELETE policy — FK cascade handles it.
alter table public.profiles_private enable row level security;

drop policy if exists profiles_private_select_own on public.profiles_private;
create policy profiles_private_select_own on public.profiles_private
  for select to authenticated using (auth.uid() = id);

drop policy if exists profiles_private_insert_self on public.profiles_private;
create policy profiles_private_insert_self on public.profiles_private
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists profiles_private_update_own on public.profiles_private;
create policy profiles_private_update_own on public.profiles_private
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);


-- profile_shares: either party (sharer or recipient) can read. Sharer
-- inserts. Either party can delete (sharer revokes; recipient opts out).
-- Phase 4 will extend the INSERT WITH CHECK to require an active friendship.
alter table public.profile_shares enable row level security;

drop policy if exists shares_select_party on public.profile_shares;
create policy shares_select_party on public.profile_shares
  for select to authenticated using (auth.uid() in (sharer_id, recipient_id));

drop policy if exists shares_insert_sharer on public.profile_shares;
create policy shares_insert_sharer on public.profile_shares
  for insert to authenticated with check (auth.uid() = sharer_id);

drop policy if exists shares_delete_party on public.profile_shares;
create policy shares_delete_party on public.profile_shares
  for delete to authenticated using (auth.uid() in (sharer_id, recipient_id));


-- ── Step 6 ──────────────────────────────────────────────────────────────────
-- GRANTs. Service role bypasses RLS regardless. No grants to anon.
grant select, insert, update on public.profiles_public  to authenticated;
grant select, insert, update on public.profiles_private to authenticated;
grant select, insert, delete on public.profile_shares   to authenticated;


-- ── Step 7 ──────────────────────────────────────────────────────────────────
-- reserved_usernames: small lookup table for impersonation-prevention. Stored
-- lowercase (CHECK enforces). The complete_onboarding RPC queries this with
-- `where word = lower(submitted_username)`. Maintenance = INSERT new words.
create table if not exists public.reserved_usernames (
  word text primary key check (word = lower(word))
);

alter table public.reserved_usernames enable row level security;

-- Authenticated users can read the list so the onboarding screen can do
-- client-side preview validation. The list is not a secret — once any user
-- tries any reserved word, the server response reveals which words are
-- reserved anyway.
drop policy if exists reserved_usernames_select_authenticated on public.reserved_usernames;
create policy reserved_usernames_select_authenticated
  on public.reserved_usernames
  for select to authenticated using (true);
-- No write policies → only service role can INSERT/UPDATE/DELETE.

grant select on public.reserved_usernames to authenticated;

-- Seed the initial 24-word list (§11.3 of the plan).
insert into public.reserved_usernames (word) values
  -- Staff impersonation
  ('admin'), ('administrator'), ('mod'), ('moderator'),
  ('staff'), ('team'), ('support'), ('help'),
  -- Platform impersonation
  ('haven'), ('havenapp'), ('official'), ('system'), ('bot'),
  -- Account-functional. Note: 'me' (2 chars) and 'you' (3 chars) are also
  -- blocked by the 4-char username minimum. Listed here for stability — if
  -- the minimum length ever relaxes, these stay reserved.
  ('me'), ('you'), ('user'), ('account'), ('profile'),
  -- Safety/abuse hotwords
  ('abuse'), ('report'), ('safety'), ('trust'),
  -- Tombstone identity (prevents impersonation of the canonical anonymized
  -- "Deleted User" identity used by the delete-account flow at d7c6a3d).
  ('deleted'), ('anonymous')
on conflict do nothing;


-- ── Step 8 ──────────────────────────────────────────────────────────────────
-- Pre-flight notices. Surfaces existing-data issues before step 9 tries to
-- create the new constraints. Format/duplicate violations are not fixed here;
-- step 9 will fail and the whole BEGIN/COMMIT block rolls back, giving you
-- a clean re-run after you fix the offending rows. Reserved-word matches in
-- existing rows are notice-only (grandfathered, per the locked decision).
do $$
declare
  bad       record;
  fmt_count int := 0;
  dup_count int := 0;
begin
  -- (a) Format / length violations against the new regex
  for bad in
    select id, username
    from public.profiles_public
    where username is not null
      and username !~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,13}[A-Za-z0-9]$'
  loop
    fmt_count := fmt_count + 1;
    raise notice 'Phase 1 pre-flight: format violation id=% username=%', bad.id, bad.username;
  end loop;

  -- (b) Case-insensitive duplicates that the new functional unique index
  --     would reject
  for bad in
    select lower(username) as lower_name, count(*) as cnt
    from public.profiles_public
    where username is not null
    group by lower(username)
    having count(*) > 1
  loop
    dup_count := dup_count + 1;
    raise notice 'Phase 1 pre-flight: case-insensitive duplicate group_count=% lower=%',
      bad.cnt, bad.lower_name;
  end loop;

  -- (c) Reserved-word matches in existing rows (grandfathered — notice only)
  for bad in
    select id, username
    from public.profiles_public
    where username is not null
      and lower(username) in (select word from public.reserved_usernames)
  loop
    raise notice 'Phase 1 pre-flight: existing username matches reserved word (grandfathered) id=% username=%',
      bad.id, bad.username;
  end loop;

  -- (d) Sanity check: print the actual name of any existing username unique
  --     constraint. If this isn't 'profiles_username_key', step 9's DROP
  --     silently no-ops via IF EXISTS and we'd be left with a stale
  --     case-sensitive unique constraint. Catch it here.
  for bad in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles_public'::regclass
      and contype = 'u'
      and conname like '%username%'
  loop
    raise notice 'Phase 1 pre-flight: existing username unique constraint name=%', bad.conname;
  end loop;

  if fmt_count > 0 or dup_count > 0 then
    raise notice 'Phase 1 pre-flight summary: % format violations, % case-insensitive duplicate groups. Constraint creation in step 9 will fail until these are resolved.',
      fmt_count, dup_count;
  end if;
end $$;


-- ── Step 9 ──────────────────────────────────────────────────────────────────
-- Drop the existing case-sensitive UNIQUE constraint on username. Postgres's
-- auto-name for `username unique` on a table originally named `profiles` is
-- typically profiles_username_key (carried through the RENAME at step 1). If
-- step 8's notice surfaced a different name, this DROP silently no-ops via
-- IF EXISTS — you'll need to issue the correct DROP manually and re-run.
alter table public.profiles_public
  drop constraint if exists profiles_username_key;

-- Case-insensitive uniqueness via partial functional unique index. Ignores
-- rows where username is null (the onboarding-incomplete state from
-- handle_new_user). Functional index is cleaner than a generated lowercase
-- column — no extra column to manage in queries.
create unique index if not exists profiles_public_username_lower_uidx
  on public.profiles_public (lower(username))
  where username is not null;

-- Format CHECK constraint. Backstop: if anything bypasses complete_onboarding
-- and writes username directly, the DB still rejects malformed values.
-- Allows NULL (the pre-onboarding state). Regex mirrors §11.6/§11.7 of the
-- plan: 4–15 chars, alphanumeric anchors, [A-Za-z0-9._-] middle.
alter table public.profiles_public
  drop constraint if exists profiles_public_username_format;
alter table public.profiles_public
  add constraint profiles_public_username_format
  check (
    username is null
    or username ~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,13}[A-Za-z0-9]$'
  );

-- profiles_public.username case-insensitive uniqueness is enforced by the
-- functional unique index profiles_public_username_lower_uidx on
-- lower(username). That index also serves case-insensitive lookups (e.g.,
-- supabase.from('profiles_public').select(...).ilike('username', $1) or any
-- lower(username) = $1 predicate). Do NOT create an explicit secondary
-- index on plain `username` — it would be redundant.


-- ── Step 10 ─────────────────────────────────────────────────────────────────
-- handle_new_user: trigger function. Replaces the prior implementation
-- (which inserted into public.profiles — now renamed). Inserts into both
-- profiles_public and profiles_private so the row pair is always consistent.
-- SECURITY DEFINER bypasses RLS, which is what we want for an auth-side
-- trigger that fires before the user has any session.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles_public (id, username, bio, intro_seen)
  values (new.id, null, null, false);

  insert into public.profiles_private (id, identity_tags)
  values (new.id, '{}'::text[]);

  return new;
end;
$$;


-- ── Step 11 ─────────────────────────────────────────────────────────────────
-- ============================================================================
-- complete_onboarding(payload jsonb)
--
-- SECURITY INVOKER — runs as the caller, respects owner-only RLS UPDATE
-- policies on profiles_public and profiles_private. Both updates run inside
-- one implicit transaction so partial states are impossible.
--
-- Operational logging: the raise log statements below feed Supabase function
-- logs for post-incident debugging. Not analytics. Onboarding bugs are
-- notoriously hard to reconstruct without server-side traces.
--
-- Future extraction: the username validation block (length → format →
-- reserved) should be lifted into public.validate_username(text) returning
-- void when a second caller materializes (e.g., a future username-change
-- settings flow). Inline for Phase 1 since complete_onboarding is the only
-- caller.
--
-- Future trust/safety: lookalike-flagging (alex_l vs alex_1) is explicitly
-- Phase 4+ work — contextual warnings shown when displaying users to people
-- who have a similar handle in their friends list. Phase 1 accepts the
-- residual risk; see STATUS.md.
-- ============================================================================
create or replace function public.complete_onboarding(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid   uuid := auth.uid();
  uname text;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Required-field check
  if not (payload ? 'username') then
    raise log 'complete_onboarding: invalid_payload uid=% reason=missing_username', uid;
    raise exception 'invalid_payload' using errcode = '22023';
  end if;

  uname := payload->>'username';

  -- Length: 4–15. Checked first so the format regex doesn't have to encode
  -- length bounds twice. Distinct errcode → distinct client message.
  if length(uname) < 4 or length(uname) > 15 then
    raise log 'complete_onboarding: username_invalid_length uid=% length=%', uid, length(uname);
    raise exception 'username_invalid_length' using errcode = 'P0012';
  end if;

  -- Format: alphanumeric anchors + [A-Za-z0-9._-] middle. Forbids leading or
  -- trailing ./_/-, allows consecutive specials in the middle, no emoji,
  -- no non-ASCII. Mirrors the DB CHECK constraint; the RPC checks first so
  -- the client gets the friendlier P0011 code instead of a 23514.
  if uname !~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,13}[A-Za-z0-9]$' then
    raise log 'complete_onboarding: username_invalid_format uid=% username=%', uid, uname;
    raise exception 'username_invalid_format' using errcode = 'P0011';
  end if;

  -- Reserved-word check (case-insensitive). One indexed PK lookup.
  if exists (
    select 1 from public.reserved_usernames where word = lower(uname)
  ) then
    raise log 'complete_onboarding: username_reserved uid=% attempted_username=%', uid, uname;
    raise exception 'username_reserved' using errcode = 'P0010';
  end if;

  begin
    update public.profiles_public
      set username   = uname,
          updated_at = now()
      where id = uid;

    update public.profiles_private
      set date_of_birth         = nullif(payload->>'date_of_birth', '')::date,
          gender_id             = payload->>'gender_id',
          pronoun_preset        = payload->>'pronoun_preset',
          pronouns_custom       = nullif(payload->>'pronouns_custom', ''),
          out_status            = payload->>'out_status',
          accepting_environment = payload->>'accepting_environment',
          identity_tags         = coalesce(
                                    (select array_agg(value)::text[]
                                     from jsonb_array_elements_text(payload->'identity_tags')),
                                    '{}'::text[]
                                  ),
          updated_at = now()
      where id = uid;
  exception
    when unique_violation then
      raise log 'complete_onboarding: username_taken uid=% attempted_username=%',
        uid, uname;
      raise;
    when others then
      raise log 'complete_onboarding: unexpected_error uid=% sqlstate=% message=%',
        uid, sqlstate, sqlerrm;
      raise;
  end;
end;
$$;

grant execute on function public.complete_onboarding(jsonb) to authenticated;


-- ── Step 12 ─────────────────────────────────────────────────────────────────
-- ============================================================================
-- get_shared_private_fields(target_uuid uuid)
--
-- SECURITY DEFINER intentionally bypasses RLS on profiles_private.
-- Access control is enforced manually inside this function:
--   * Owner viewing themselves: full row.
--   * Cross-user: each field gated by an existence check on profile_shares.
--
-- ALWAYS returns exactly one row regardless of whether target_uuid exists in
-- profiles_private. A nonexistent target and an existing-but-unshared target
-- are indistinguishable from the caller's perspective. This is deliberate —
-- 'does this Haven account exist' is itself sensitive information.
--
-- Future trust/safety: this function is a potential UUID-probing surface.
-- Once Haven has real users, wrap with Edge Function rate limiting or apply
-- Supabase rate limiting per-caller. Not Phase 1 work — flagged here so
-- future readers don't miss it when planning ops hardening.
--
-- Future perf: the six EXISTS subqueries are independent today. At MVP scale
-- this is fine. If profile-view query volume warrants optimization later,
-- fetch the caller's share permissions for target_uuid into an array once,
-- then do membership checks against that array. Defer until measurements
-- demand it.
-- ============================================================================
create or replace function public.get_shared_private_fields(target_uuid uuid)
returns table (
  date_of_birth         date,
  gender_id             text,
  pronoun_preset        text,
  pronouns_custom       text,
  out_status            text,
  accepting_environment text,
  identity_tags         text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Owner branch. Anchored on a synthetic single-row source so callers always
  -- get exactly one row — even if (somehow) the user has no profiles_private
  -- row (handle_new_user race / corruption).
  if caller = target_uuid then
    return query
      select p.date_of_birth, p.gender_id, p.pronoun_preset, p.pronouns_custom,
             p.out_status, p.accepting_environment, p.identity_tags
      from (select target_uuid as id) anchor
      left join public.profiles_private p on p.id = anchor.id;
    return;
  end if;

  -- Cross-user branch. Same anchor + LEFT JOIN pattern. If target_uuid
  -- doesn't exist in profiles_private, p.* is all-null. If target exists but
  -- caller has no share rows, the EXISTS subqueries are all false and the
  -- CASE expressions return null. The two cases are indistinguishable
  -- downstream — see header.
  return query
    select
      case when exists (
        select 1 from public.profile_shares s
        where s.sharer_id = target_uuid and s.recipient_id = caller
              and s.field = 'date_of_birth'
      ) then p.date_of_birth else null end,
      case when exists (
        select 1 from public.profile_shares s
        where s.sharer_id = target_uuid and s.recipient_id = caller
              and s.field = 'gender_id'
      ) then p.gender_id else null end,
      -- 'pronouns' covers both preset and custom together (single UI control)
      case when exists (
        select 1 from public.profile_shares s
        where s.sharer_id = target_uuid and s.recipient_id = caller
              and s.field = 'pronouns'
      ) then p.pronoun_preset else null end,
      case when exists (
        select 1 from public.profile_shares s
        where s.sharer_id = target_uuid and s.recipient_id = caller
              and s.field = 'pronouns'
      ) then p.pronouns_custom else null end,
      case when exists (
        select 1 from public.profile_shares s
        where s.sharer_id = target_uuid and s.recipient_id = caller
              and s.field = 'out_status'
      ) then p.out_status else null end,
      case when exists (
        select 1 from public.profile_shares s
        where s.sharer_id = target_uuid and s.recipient_id = caller
              and s.field = 'accepting_environment'
      ) then p.accepting_environment else null end,
      case when exists (
        select 1 from public.profile_shares s
        where s.sharer_id = target_uuid and s.recipient_id = caller
              and s.field = 'identity_tags'
      ) then p.identity_tags else null end
    from (select target_uuid as id) anchor
    left join public.profiles_private p on p.id = anchor.id;
end;
$$;

revoke all on function public.get_shared_private_fields(uuid) from public;
revoke all on function public.get_shared_private_fields(uuid) from anon;
grant execute on function public.get_shared_private_fields(uuid) to authenticated;


-- ── Step 13 ─────────────────────────────────────────────────────────────────
-- ============================================================================
-- get_profile_metrics(target_uuid uuid)
--
-- SECURITY DEFINER intentionally bypasses RLS on chat_members and friendships
-- (when they land). Counts are universally readable — aggregate-only, no
-- row-level leakage. The function is the gatekeeper; if we later restrict
-- counts to friends-only, the change goes in the body.
--
-- Phase 1 stub: returns (0, 0). Phase 8 swaps the body for:
--   select
--     (select count(*)::int from chat_members where user_id = target_uuid),
--     (select count(*)::int from friendships
--        where user_a_id = target_uuid or user_b_id = target_uuid);
-- ============================================================================
create or replace function public.get_profile_metrics(target_uuid uuid)
returns table (chat_count int, friend_count int)
language sql
security definer
set search_path = public
as $$
  select 0::int, 0::int;
$$;

revoke all on function public.get_profile_metrics(uuid) from public;
revoke all on function public.get_profile_metrics(uuid) from anon;
grant execute on function public.get_profile_metrics(uuid) to authenticated;


-- ── Step 14 ─────────────────────────────────────────────────────────────────
-- delete_user_data: extended to clear profile_shares + profiles_private +
-- profiles_public. The FK cascade from profiles_public would handle
-- profiles_private automatically, but explicit DELETEs give us audit-log
-- row counts for each table.
--
-- Order matters: profile_shares first (no FK in either direction to the
-- profiles tables since cascades go the other way — but logically the share
-- row belongs to the pair, delete it as part of the user's data), then
-- profiles_private (cascade-equivalent, explicit for audit), then
-- profiles_public (cascade source).
create or replace function public.delete_user_data(uid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  anonymized_messages        int := 0;
  anonymized_reports_filed   int := 0;
  anonymized_reports_against int := 0;
  deleted_blocks             int := 0;
  deleted_profile_shares     int := 0;
  deleted_profile_private    int := 0;
  deleted_profile_public     int := 0;
begin
  -- == Anonymization (placeholders for tables that don't exist yet) =========
  -- Canonical tombstone identity (matches the ANONYMIZED_USER constant on
  -- the client). Future tables that surface user content in the UI should
  -- use this same shape so renderers can avoid null-checks.

  -- Messages — uncomment when chat lands:
  -- update public.messages
  --   set sender_id            = null,
  --       sender_display_name  = 'Deleted User',
  --       sender_avatar_url    = null
  --   where sender_id = uid;
  -- get diagnostics anonymized_messages = row_count;

  -- Reports filed BY this user — uncomment when reports table lands:
  -- update public.reports
  --   set reporter_id           = null,
  --       reporter_display_name = 'Deleted User'
  --   where reporter_id = uid;
  -- get diagnostics anonymized_reports_filed = row_count;

  -- Reports filed AGAINST this user — uncomment when reports table lands:
  -- update public.reports
  --   set reported_id           = null,
  --       reported_display_name = 'Deleted User'
  --   where reported_id = uid;
  -- get diagnostics anonymized_reports_against = row_count;

  -- == Deletion =============================================================
  -- Blocks — uncomment when blocks table lands:
  -- delete from public.blocks where blocker_id = uid;
  -- get diagnostics deleted_blocks = row_count;

  -- Profile shares — delete every row this user is on either side of.
  delete from public.profile_shares
    where sharer_id = uid or recipient_id = uid;
  get diagnostics deleted_profile_shares = row_count;

  -- profiles_private cascades from profiles_public via FK on delete cascade;
  -- explicit delete is belt-and-suspenders so the audit log shows the
  -- per-table row count.
  delete from public.profiles_private where id = uid;
  get diagnostics deleted_profile_private = row_count;

  delete from public.profiles_public where id = uid;
  get diagnostics deleted_profile_public = row_count;

  return jsonb_build_object(
    'anonymized_messages',        anonymized_messages,
    'anonymized_reports_filed',   anonymized_reports_filed,
    'anonymized_reports_against', anonymized_reports_against,
    'deleted_blocks',             deleted_blocks,
    'deleted_profile_shares',     deleted_profile_shares,
    'deleted_profile_private',    deleted_profile_private,
    'deleted_profile_public',     deleted_profile_public
  );
end;
$$;

-- GRANTs unchanged from the original delete-account migration: service role only.
revoke all on function public.delete_user_data(uuid) from public;
revoke all on function public.delete_user_data(uuid) from anon;
revoke all on function public.delete_user_data(uuid) from authenticated;
grant execute on function public.delete_user_data(uuid) to service_role;

commit;
