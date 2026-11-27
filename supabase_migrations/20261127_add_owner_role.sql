-- ========================================================
-- Migration: add 'owner' role + last-owner safeguard
-- Date: 2026-11-27
-- Target: live Supabase project tgbfpzdidorqpkwnogjh
-- (also mirrored in supabase_schema.sql for fresh installs)
--
-- Safe to run once; rerunning is harmless (all steps are guarded).
-- ========================================================

-- 1. Widen users.role CHECK to include 'owner'.
-- The role CHECK in supabase_schema.sql is inline/unnamed, so on the live
-- database Postgres auto-named it users_role_check. Rather than assuming
-- that name, drop whichever CHECK on users.role exists (matched by
-- definition), then add the named constraint with the full role list.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND contype = 'c'
      AND (conname = 'users_role_check' OR pg_get_constraintdef(oid) ILIKE '%role%')
  LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', r.conname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('applicant', 'field_officer', 'documentation_officer', 'advocacy_officer', 'technical_officer', 'president', 'vice_president', 'faculty_advisor', 'works_dept', 'admin', 'owner'));
  END IF;
END $$;

-- 2. Last-owner safeguard: the final active owner cannot be demoted to
-- another role or deactivated. (Same function/trigger as supabase_schema.sql.)
CREATE OR REPLACE FUNCTION public.protect_last_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role = 'owner' AND OLD.status = 'active'
    AND (NEW.role <> 'owner' OR NEW.status = 'inactive') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE role = 'owner'
        AND status = 'active'
        AND id <> OLD.id
    ) THEN
      RAISE EXCEPTION 'Cannot remove the last remaining owner.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_last_owner_before_update ON public.users;
CREATE TRIGGER protect_last_owner_before_update
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE PROCEDURE public.protect_last_owner();
