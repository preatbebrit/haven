-- ============================================================================
-- Grant service_role table-level privileges on public.account_deletion_log.
--
-- The original migration (20260520120000_delete_account.sql) created the
-- table and enabled RLS but did NOT grant service_role any table-level
-- privileges. In production this caused the delete-account Edge Function's
-- inserts/updates to silently no-op: the function still returned 200 and
-- the RPC + auth.admin.deleteUser succeeded, but no audit row was ever
-- written. RLS bypass alone is insufficient — the role still needs the
-- underlying table grants.
--
-- This grant was applied manually in production on 2026-05-23 to unbreak
-- audit logging. This migration captures it so the fix survives any rebuild
-- from migrations (fresh dev DB, restore-from-backup, schema reset).
--
-- RLS posture is unchanged: row-level security stays enabled with zero
-- policies. service_role bypasses RLS, so it remains the only caller that
-- can see or write rows. anon/authenticated still see nothing.
-- ============================================================================

grant select, insert, update, delete
  on public.account_deletion_log
  to service_role;
