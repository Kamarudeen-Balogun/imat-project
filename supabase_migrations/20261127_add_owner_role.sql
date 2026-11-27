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

-- 3. RLS: let 'owner' do everything 'admin' can.
-- 'owner' was in no RLS policy yet, so an owner was locked out of every
-- admin-gated policy below. Each policy is dropped and recreated with
-- 'owner' added alongside 'admin' (same DROP + CREATE pattern as
-- supabase_schema.sql). Safe to rerun (DROP POLICY IF EXISTS guards).

-- site_social_links
DROP POLICY IF EXISTS "Admins can manage site social links" ON site_social_links;
CREATE POLICY "Admins can manage site social links" ON site_social_links FOR ALL USING (
  get_my_role() IN ('admin', 'owner')
) WITH CHECK (
  get_my_role() IN ('admin', 'owner')
);

-- evidence_gallery
DROP POLICY IF EXISTS "Evidence gallery editors can manage evidence" ON evidence_gallery;
CREATE POLICY "Evidence gallery editors can manage evidence" ON evidence_gallery FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role IN ('documentation_officer', 'admin', 'owner')
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role IN ('documentation_officer', 'admin', 'owner')
  )
);

-- applications
DROP POLICY IF EXISTS "Admins read all applications" ON applications;
CREATE POLICY "Admins read all applications" ON applications FOR SELECT USING (get_my_role() IN ('technical_officer', 'president', 'admin', 'owner'));
DROP POLICY IF EXISTS "Admins update applications" ON applications;
CREATE POLICY "Admins update applications" ON applications FOR UPDATE USING (get_my_role() IN ('technical_officer', 'president', 'admin', 'owner'));

-- intake_cycles
DROP POLICY IF EXISTS "Authorized members can manage intake cycles" ON intake_cycles;
CREATE POLICY "Authorized members can manage intake cycles" ON intake_cycles FOR ALL USING (
  get_my_role() IN ('technical_officer', 'president', 'admin', 'owner')
) WITH CHECK (
  get_my_role() IN ('technical_officer', 'president', 'admin', 'owner')
);

-- volunteer_logs
DROP POLICY IF EXISTS "Members can view volunteer logs" ON volunteer_logs;
CREATE POLICY "Members can view volunteer logs" ON volunteer_logs FOR SELECT USING (
  auth.uid() = member_id OR get_my_role() IN ('admin', 'owner')
);
DROP POLICY IF EXISTS "Members can update own volunteer logs" ON volunteer_logs;
CREATE POLICY "Members can update own volunteer logs" ON volunteer_logs FOR UPDATE USING (
  auth.uid() = member_id OR get_my_role() IN ('admin', 'owner')
) WITH CHECK (
  auth.uid() = member_id OR get_my_role() IN ('admin', 'owner')
);

-- announcements
DROP POLICY IF EXISTS "Authorized members can insert announcements" ON announcements;
CREATE POLICY "Authorized members can insert announcements" ON announcements FOR INSERT WITH CHECK (
  get_my_role() IN ('advocacy_officer', 'president', 'admin', 'owner')
);
DROP POLICY IF EXISTS "Authorized members can update announcements" ON announcements;
CREATE POLICY "Authorized members can update announcements" ON announcements FOR UPDATE USING (
  get_my_role() IN ('advocacy_officer', 'president', 'admin', 'owner')
);
DROP POLICY IF EXISTS "Authorized members can delete announcements" ON announcements;
CREATE POLICY "Authorized members can delete announcements" ON announcements FOR DELETE USING (
  get_my_role() IN ('president', 'admin', 'owner')
);

-- notifications
DROP POLICY IF EXISTS "Users can insert news notifications" ON notifications;
CREATE POLICY "Users can insert news notifications" ON notifications FOR INSERT WITH CHECK (
  get_my_role() IN ('advocacy_officer', 'president', 'admin', 'owner')
  AND type = 'news_update'
  AND recipient_id IN (
    SELECT id FROM users WHERE notifications_enabled = true AND status = 'active'
  )
  AND (
    announcement_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM announcements a
      JOIN users u ON u.id = recipient_id
      WHERE a.id = announcement_id
      AND (
        a.visibility = 'public'
        OR (a.visibility = 'members_only' AND u.role <> 'applicant')
      )
    )
  )
);

-- wiki_pages
DROP POLICY IF EXISTS "Authorized members can insert wiki pages" ON wiki_pages;
CREATE POLICY "Authorized members can insert wiki pages" ON wiki_pages FOR INSERT WITH CHECK (
  get_my_role() IN ('documentation_officer', 'president', 'admin', 'owner')
);
DROP POLICY IF EXISTS "Authorized members can update wiki pages" ON wiki_pages;
CREATE POLICY "Authorized members can update wiki pages" ON wiki_pages FOR UPDATE USING (
  get_my_role() IN ('documentation_officer', 'president', 'admin', 'owner')
);
DROP POLICY IF EXISTS "Authorized members can delete wiki pages" ON wiki_pages;
CREATE POLICY "Authorized members can delete wiki pages" ON wiki_pages FOR DELETE USING (
  get_my_role() IN ('president', 'admin', 'owner')
);

-- activity_logs
DROP POLICY IF EXISTS "Members can insert own activity logs" ON activity_logs;
CREATE POLICY "Members can insert own activity logs" ON activity_logs FOR INSERT WITH CHECK (
  auth.uid() = actor_id
  AND get_my_role() IN (
    'field_officer',
    'documentation_officer',
    'advocacy_officer',
    'technical_officer',
    'president',
    'vice_president',
    'faculty_advisor',
    'works_dept',
    'admin',
    'owner'
  )
);
DROP POLICY IF EXISTS "Admins can delete activity logs" ON activity_logs;
CREATE POLICY "Admins can delete activity logs" ON activity_logs FOR DELETE USING (
  get_my_role() IN ('admin', 'owner')
);
