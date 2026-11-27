-- ========================================================
-- Migration: email_logs (Mail Log)
-- Date: 2026-11-27
-- Target: live Supabase project tgbfpzdidorqpkwnogjh
-- (also mirrored in supabase_schema.sql for fresh installs)
--
-- One row per email the site sends via Resend, written by the
-- shared sendEmail helper in imat-web/src/lib/email.ts.
-- The dashboard Mail Log page (/dashboard/email-logs) reads it
-- so owners/admins can check what went out, to whom, and
-- whether it sent or failed. The log starts at deploy; old
-- mails are NOT backfilled (Resend API reads are restricted).
--
-- Safe to run once; rerunning is harmless (all steps guarded).
-- ========================================================

-- 1. Table: one row per sent (or failed) email.
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL DEFAULT 'general',
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  resend_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_logs_created_at_idx ON public.email_logs(created_at DESC);

-- 2. GRANTs — RLS policies alone are not enough (see the
-- 2026-11-27 access-denied fix: without GRANTs, reads fail
-- with 401 "permission denied for table ..."). Explicit
-- per-table grants; the global ALTER DEFAULT PRIVILEGES in
-- supabase_schema.sql covers future tables as well.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_logs TO anon, authenticated, service_role;

-- 3. Row Level Security.
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policies. Only owner/admin can read the log. Inserts come
-- from sendEmail via the service-role admin client, which
-- bypasses RLS, so no INSERT policy is needed.
DROP POLICY IF EXISTS "Owners and admins can read email logs" ON public.email_logs;
CREATE POLICY "Owners and admins can read email logs" ON public.email_logs
  FOR SELECT USING (get_my_role() IN ('owner', 'admin'));
