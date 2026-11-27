-- ========================================================
-- Migration: track announcement email delivery per
-- notification row (email_sent_at)
-- Date: 2026-11-27
-- Target: live Supabase project tgbfpzdidorqpkwnogjh
-- (also mirrored in supabase_schema.sql for fresh installs)
--
-- Safe to run once; rerunning is harmless (guarded).
-- ========================================================

-- One email per notification row, never two: the sender marks a row
-- email_sent_at only after its email was accepted, and only selects
-- rows where email_sent_at IS NULL.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
