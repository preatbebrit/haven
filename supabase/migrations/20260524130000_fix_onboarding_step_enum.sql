-- ============================================================================
-- Correct the onboarding_step CHECK constraint to match the actual flow.
--
-- chunk 1 of this work (20260524120000_onboarding_resumability_schema.sql)
-- used a 9-value enum based on an inaccurate step model that included
-- separate 'dob', 'lockscreen', 'accepting_environment', 'resources', and
-- 'identity' values. The actual onboarding flow has 7 steps, and several
-- names differ. This migration replaces the constraint with the correct
-- enum.
--
-- The constraint is the only thing being changed. Column types, defaults,
-- and related function bodies (handle_new_user, complete_onboarding) are
-- unchanged because they don't reference specific step values.
--
-- Since no row has yet been written with onboarding_step set (the client
-- code that does so hasn't shipped — chunk 2+), there is no data to
-- migrate.
-- ============================================================================

begin;

alter table public.profiles_public
  drop constraint if exists profiles_public_onboarding_step_check;

alter table public.profiles_public
  add constraint profiles_public_onboarding_step_check
  check (onboarding_step is null or onboarding_step in (
    'username', 'age', 'lock', 'gender', 'pronouns', 'out_status', 'identities'
  ));

commit;
