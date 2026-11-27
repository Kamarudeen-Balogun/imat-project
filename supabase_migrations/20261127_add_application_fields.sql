-- ========================================================
-- Migration: store the full application form + stop
-- inventing a CGPA
-- Date: 2026-11-27
-- Target: live Supabase project tgbfpzdidorqpkwnogjh
-- (also mirrored in supabase_schema.sql for fresh installs)
--
-- Background
-- ----------
-- The /apply form collects far more than the applications table
-- kept: gender, phone, address, graduation year, leadership,
-- working groups, skills, time commitment, referee details and
-- the declaration only reached the Google Sheet, and a third
-- chosen position was dropped (only role_preference_1/2 existed).
-- The form also only asks "Is your CGPA above 3.00? Yes/No",
-- but the API wrote a made-up 3.5 / 2.5 into the NOT NULL
-- numeric cgpa column, which the review page then displayed as
-- a real CGPA (and the accept route copied into users.cgpa).
--
-- This migration:
--   1. Adds a column for every form field the table was missing.
--   2. Adds role_preference_3 so a third chosen position is kept.
--   3. Makes applications.cgpa nullable and stores NULL for it;
--      the real Yes/No answer lives in cgpa_above_3.
--
-- Safe to run once; rerunning is harmless (all steps are guarded).
-- ========================================================

-- 1. New columns for the form fields that only reached the sheet.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS graduation_year TEXT,
  ADD COLUMN IF NOT EXISTS leadership TEXT,
  ADD COLUMN IF NOT EXISTS leadership_detail TEXT,
  ADD COLUMN IF NOT EXISTS working_groups TEXT[],
  ADD COLUMN IF NOT EXISTS skills TEXT[],
  ADD COLUMN IF NOT EXISTS other_skills TEXT,
  ADD COLUMN IF NOT EXISTS time_commitment TEXT,
  ADD COLUMN IF NOT EXISTS referee_name TEXT,
  ADD COLUMN IF NOT EXISTS referee_dept TEXT,
  ADD COLUMN IF NOT EXISTS referee_email TEXT,
  ADD COLUMN IF NOT EXISTS referee_phone TEXT,
  ADD COLUMN IF NOT EXISTS agreement TEXT,
  ADD COLUMN IF NOT EXISTS signature TEXT,
  ADD COLUMN IF NOT EXISTS signature_date TEXT,
  ADD COLUMN IF NOT EXISTS cgpa_above_3 BOOLEAN;

-- 2. Keep a third chosen position instead of dropping it.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS role_preference_3 TEXT;

-- 3. The form never collects a numeric CGPA, only Yes/No for
-- "above 3.00". Stop requiring a number; NULL from here on.
-- (Existing rows keep their old 3.5 / 2.5 values; they predate
-- this fix and are not rewritten by this migration.)
ALTER TABLE public.applications
  ALTER COLUMN cgpa DROP NOT NULL;
