-- ========================================================
-- Migration: contact_messages inbox
-- Date: 2026-11-27
-- Target: live Supabase project tgbfpzdidorqpkwnogjh
-- (also mirrored in supabase_schema.sql for fresh installs)
--
-- Stores a copy of every contact-form submission in Supabase so
-- members can read them in the dashboard inbox. The Google Apps
-- Script sheet stays the source of truth: the contact API only
-- inserts here after the sheet call succeeds.
--
-- Safe to run once; rerunning is harmless (all steps are guarded).
-- ========================================================

-- 1. Table: one row per contact-form submission.
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Row Level Security.
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- 3. Policies (same DROP + CREATE pattern as supabase_schema.sql).
-- Members can read every message; only the owner can delete one.
-- Inserts come from the contact API via the service-role admin client,
-- which bypasses RLS, so no INSERT policy is needed.
DROP POLICY IF EXISTS "Members can read contact messages" ON public.contact_messages;
CREATE POLICY "Members can read contact messages" ON public.contact_messages
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only owner can delete contact messages" ON public.contact_messages;
CREATE POLICY "Only owner can delete contact messages" ON public.contact_messages
  FOR DELETE USING (get_my_role() = 'owner');
