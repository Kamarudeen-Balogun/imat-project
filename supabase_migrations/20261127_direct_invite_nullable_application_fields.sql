-- ========================================================
-- Migration: allow direct invites without an application form
-- Date: 2026-11-27
-- Target: live Supabase project tgbfpzdidorqpkwnogjh
-- (also mirrored in supabase_schema.sql for fresh installs)
--
-- Background
-- ----------
-- Direct invites create an accepted application row for someone
-- who never filled the /apply form, so there is no matric number,
-- level, motivation statement or CV to store. Those four columns
-- were NOT NULL from the original schema, which would force the
-- invite flow to invent values (the same made-up-data problem
-- fixed for CGPA on 2026-11-27). Make them nullable instead; the
-- member fills matric and level in on their profile after they
-- set a password and log in. The users table already allows
-- matric_no / level NULL, so the accept flow copies NULLs through
-- unchanged.
--
-- department stays NOT NULL: every IMAT member is Civil
-- Engineering, so direct invites store 'Civil Engineering'
-- honestly rather than leaving it blank.
--
-- Safe to run once; rerunning is harmless (all steps are guarded).
-- ========================================================

ALTER TABLE public.applications
  ALTER COLUMN matric_no DROP NOT NULL,
  ALTER COLUMN level DROP NOT NULL,
  ALTER COLUMN motivation_statement DROP NOT NULL,
  ALTER COLUMN cv_url DROP NOT NULL;
