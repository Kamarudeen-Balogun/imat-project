-- ========================================================
-- Migration: mirror the live-DB access fixes into the repo,
-- and carry the applicant phone number to the member record
-- Date: 2026-11-27
-- Target: live Supabase project tgbfpzdidorqpkwnogjh
-- (also mirrored in supabase_schema.sql for fresh installs)
--
-- 1. GRANTs — the live DB was fixed by hand on 2026-11-27
--    because supabase_schema.sql had zero GRANTs, so
--    anon/authenticated/service_role had no table privileges
--    and every member-area read failed 401. RLS policies
--    alone are not enough.
-- 2. Applicant policy — the old policy read auth.users,
--    which anon/authenticated cannot access, so it errored
--    the whole applications query. The JWT-based version
--    reads the email claim from the caller's own token.
-- 3. users.phone — the /apply form collects a phone number
--    into applications.phone, but public.users had no phone
--    column, so it never reached the member record.
--
-- Safe to run once; rerunning is harmless (all guarded /
-- idempotent).
-- ========================================================

-- 1. Grants (idempotent by nature).
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

-- 2. Applicant policy: read own application via the JWT email claim.
DROP POLICY IF EXISTS "Applicants can read own application" ON applications;
CREATE POLICY "Applicants can read own application" ON applications FOR SELECT USING (email = (auth.jwt() ->> 'email'));

-- 3. Phone column on the member record.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone TEXT;
