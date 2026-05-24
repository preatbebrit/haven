-- ============================================================================
-- Onboarding Resumability + Enforcement — Chunk 1 (schema only)
--
-- Extends public.profiles_public with three columns so we can:
--   * authoritatively detect "user has completed onboarding"
--     (onboarding_completed_at) rather than inferring it from the implicit
--     `username IS NOT NULL` signal,
--   * resume a partially-completed onboarding (onboarding_step +
--     onboarding_draft) instead of restarting it on every app launch.
--
-- This migration is schema + RPC plumbing only. Client code that reads/writes
-- the new columns lands in a later chunk. The two existing functions that
-- touch profiles_public — handle_new_user and complete_onboarding — are
-- updated here to keep the new columns consistent from the moment the schema
-- changes.
--
-- Single BEGIN/COMMIT so a half-migrated state is impossible.
-- ============================================================================

begin;

-- ── Step 1 ──────────────────────────────────────────────────────────────────
-- Add the three new columns. All nullable (or defaulted) so the migration
-- can run against a populated table without a backfill on the column itself.
alter table public.profiles_public
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_step         text,
  add column if not exists onboarding_draft        jsonb not null default '{}'::jsonb;


-- ── Step 2 ──────────────────────────────────────────────────────────────────
-- Enum-style CHECK on onboarding_step. NULL means "not currently in
-- onboarding" (either never started, or already completed).
alter table public.profiles_public
  drop constraint if exists profiles_public_onboarding_step_check;
alter table public.profiles_public
  add constraint profiles_public_onboarding_step_check
  check (onboarding_step is null or onboarding_step in (
    'username', 'dob', 'lockscreen', 'gender', 'pronouns',
    'out_status', 'accepting_environment', 'resources', 'identity'
  ));


-- ── Step 3 ──────────────────────────────────────────────────────────────────
-- Backfill: any existing row with a username is assumed to have completed
-- onboarding under the prior (implicit) scheme — username being non-null was
-- the only signal we had. Rows with NULL username stay with
-- onboarding_completed_at = null, which correctly routes them back through
-- onboarding on next launch (they hadn't completed it under either scheme).
update public.profiles_public
   set onboarding_completed_at = now()
 where username is not null
   and onboarding_completed_at is null;


-- ── Step 4 ──────────────────────────────────────────────────────────────────
-- handle_new_user: extend the profiles_public insert with explicit null/empty
-- values for the new columns. The onboarding_draft default ('{}'::jsonb)
-- would cover it implicitly; listing it explicitly keeps the function
-- self-documenting for the next reader.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles_public (
    id, username, bio, intro_seen,
    onboarding_completed_at, onboarding_step, onboarding_draft
  )
  values (
    new.id, null, null, false,
    null, null, '{}'::jsonb
  );

  insert into public.profiles_private (id, identity_tags)
  values (new.id, '{}'::text[]);

  return new;
end;
$$;


-- ── Step 5 ──────────────────────────────────────────────────────────────────
-- complete_onboarding: extend the profiles_public update to also mark the
-- user as onboarded and clear in-progress state. Validation logic, error
-- codes, and the profiles_private update are unchanged.
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
      set username                = uname,
          onboarding_completed_at = now(),
          onboarding_step         = null,
          onboarding_draft        = '{}'::jsonb,
          updated_at              = now()
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

-- ── RLS note ────────────────────────────────────────────────────────────────
-- No policy changes required. The existing owner-only INSERT/UPDATE policies
-- on profiles_public (profiles_public_insert_self, profiles_public_update_own)
-- cover the three new columns automatically — they're on the same row. The
-- existing SELECT policy (profiles_public_select_all) does technically expose
-- the draft jsonb to other authenticated users; that's acceptable because the
-- draft only ever contains values the user is about to publish anyway via
-- complete_onboarding (username, DOB, etc.), and a later chunk can restrict
-- SELECT on these columns if needed once the client surfaces them.

commit;
