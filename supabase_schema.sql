-- ========================================================
-- IMAT Database Schema & Setup
-- Execute this file in full in your Supabase SQL editor.
--
-- Professional rerun guarantees:
-- - Safe to rerun on existing environments (idempotent statements are used).
-- - Safe on fresh clones (dependency order is enforced for functions/triggers).
-- - Data seed blocks use conflict-safe inserts where applicable.
-- ========================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CAMPUS ZONES (Pre-seeded)
CREATE TABLE IF NOT EXISTS campus_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  geojson_polygon JSONB,
  zone_area_factor NUMERIC DEFAULT 1
);

-- Seed Campus Zones
INSERT INTO campus_zones (name, description, zone_area_factor) VALUES
  ('Hostel Zone A', 'Includes main student residential blocks A-C', 3),
  ('Hostel Zone B', 'Includes student residential blocks D-F', 3),
  ('Academic Block', 'Main lecture theaters and faculty buildings', 5),
  ('Admin Complex', 'Senate building and administrative offices', 2),
  ('Sports Complex', 'University stadium and indoor sports halls', 4),
  ('Main Gate Road', 'Entrance avenue and immediate vicinity', 2),
  ('Workshop Area', 'Engineering workshops and laboratories', 3),
  ('Staff Quarters', 'University staff residential area', 4)
ON CONFLICT (name) DO NOTHING;


-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  matric_no TEXT,
  phone TEXT,
  level INTEGER,
  cgpa NUMERIC(3,2),
  role TEXT NOT NULL DEFAULT 'applicant' CHECK (role IN ('applicant', 'field_officer', 'documentation_officer', 'advocacy_officer', 'technical_officer', 'president', 'vice_president', 'faculty_advisor', 'works_dept', 'admin', 'owner')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  zone_id UUID REFERENCES campus_zones(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);
CREATE INDEX IF NOT EXISTS users_status_notifications_idx ON users(status, notifications_enabled);
CREATE INDEX IF NOT EXISTS users_role_status_idx ON users(role, status);

-- Widen the users.role CHECK to include 'owner' on existing databases.
-- (CREATE TABLE IF NOT EXISTS above only applies to fresh installs, and the
-- inline CHECK is unnamed, so Postgres auto-named it users_role_check.
-- Drop whichever role CHECK exists, matched by definition, not by name.)
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

-- Utility Function: Get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION protect_user_self_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF get_my_role() <> 'admin' THEN
    IF NEW.id <> OLD.id
      OR NEW.email <> OLD.email
      OR NEW.role <> OLD.role
      OR NEW.status <> OLD.status
      OR NEW.joined_at <> OLD.joined_at
      OR NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'Protected user fields cannot be modified by the account owner.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Last-owner safeguard: the final active owner cannot be demoted to another
-- role or deactivated. Other owners/admins must exist first.
CREATE OR REPLACE FUNCTION protect_last_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role = 'owner' AND OLD.status = 'active'
    AND (NEW.role <> 'owner' OR NEW.status = 'inactive') THEN
    IF NOT EXISTS (
      SELECT 1 FROM users
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

DROP TRIGGER IF EXISTS protect_last_owner_before_update ON users;
CREATE TRIGGER protect_last_owner_before_update
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE protect_last_owner();


-- 3. INTAKE CYCLES
CREATE TABLE IF NOT EXISTS intake_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  open_date TIMESTAMPTZ NOT NULL,
  close_date TIMESTAMPTZ NOT NULL,
  max_slots INTEGER NOT NULL DEFAULT 25,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 4. APPLICATIONS
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID REFERENCES intake_cycles(id) ON DELETE CASCADE,
  applicant_name TEXT NOT NULL,
  email TEXT NOT NULL,
  -- Nullable since 2026-11-27 (direct invites): a directly invited
  -- member never filled the /apply form, so there is no matric
  -- number, level, motivation statement or CV to store. They fill
  -- matric and level in on their profile after first login.
  matric_no TEXT,
  level INTEGER,
  cgpa NUMERIC(3,2),
  cgpa_above_3 BOOLEAN,
  phone TEXT,
  gender TEXT,
  address TEXT,
  graduation_year TEXT,
  leadership TEXT,
  leadership_detail TEXT,
  working_groups TEXT[],
  skills TEXT[],
  other_skills TEXT,
  time_commitment TEXT,
  referee_name TEXT,
  referee_dept TEXT,
  referee_email TEXT,
  referee_phone TEXT,
  agreement TEXT,
  signature TEXT,
  signature_date TEXT,
  department TEXT NOT NULL CHECK (department = 'Civil Engineering'),
  role_preference_1 TEXT NOT NULL,
  role_preference_2 TEXT,
  role_preference_3 TEXT,
  motivation_statement TEXT,
  cv_url TEXT,
  transcript_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'accepted', 'waitlisted', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 5. DEFECTS
CREATE TABLE IF NOT EXISTS defects (
  id TEXT PRIMARY KEY DEFAULT 'DEF-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6)),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('drainage', 'road', 'walkway', 'structure', 'other')),
  defect_type TEXT NOT NULL,
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  affected_area_sqm NUMERIC,
  location_lat NUMERIC,
  location_lng NUMERIC,
  campus_zone_id UUID REFERENCES campus_zones(id),
  reported_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'assessed', 'escalated', 'acknowledged_by_works', 'resolved')),
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS defects_created_at_idx ON defects(created_at DESC);
CREATE INDEX IF NOT EXISTS defects_status_created_at_idx ON defects(status, created_at DESC);
CREATE INDEX IF NOT EXISTS defects_category_created_at_idx ON defects(category, created_at DESC);
CREATE INDEX IF NOT EXISTS defects_campus_zone_created_at_idx ON defects(campus_zone_id, created_at DESC);


-- 6. SEVERITY CRITERIA (Reference table)
CREATE TABLE IF NOT EXISTS severity_criteria (
  severity_level INTEGER PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  escalation_path TEXT NOT NULL,
  target_resolution_days INTEGER NOT NULL
);

INSERT INTO severity_criteria (severity_level, label, description, escalation_path, target_resolution_days) VALUES
  (1, 'Cosmetic', 'Surface blemish, no structural risk', 'Note in database', 90),
  (2, 'Minor', 'Limited functionality impact', 'Include in next quarterly report', 60),
  (3, 'Moderate', 'Affects student safety or campus operations', 'Escalate in biannual report', 30),
  (4, 'Critical', 'Active hazard, requires urgent attention', 'Escalate immediately to Works Dept', 7),
  (5, 'Emergency', 'Imminent structural/safety risk', 'Notify Faculty Advisor + Works Dept same day', 1)
ON CONFLICT (severity_level) DO NOTHING;


-- 7. DEFECT HISTORY
CREATE TABLE IF NOT EXISTS defect_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  defect_id TEXT REFERENCES defects(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  notes TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to auto-update defects.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_defects_updated_at ON defects;
CREATE TRIGGER update_defects_updated_at
BEFORE UPDATE ON defects
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- 8. ASSESSMENTS
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  defect_id TEXT REFERENCES defects(id) ON DELETE CASCADE NOT NULL,
  officer_id UUID REFERENCES users(id) NOT NULL,
  assessment_date TIMESTAMPTZ DEFAULT now(),
  field_notes TEXT NOT NULL,
  measurement_data JSONB DEFAULT '{}'::jsonb,
  recommendations TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 9. REPORTS
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  authored_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published')),
  pdf_url TEXT,
  defects_included JSONB DEFAULT '[]'::jsonb,
  summary_stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_status_created_at_idx ON reports(status, created_at DESC);


-- 10. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  author_id UUID REFERENCES users(id),
  visibility TEXT DEFAULT 'members_only' CHECK (visibility IN ('public', 'members_only')),
  published_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  topic TEXT,
  excerpt TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'pending_approval', 'published')),
  video_url TEXT,
  review_note TEXT,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS announcements_published_at_idx ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS announcements_visibility_published_at_idx ON announcements(visibility, published_at DESC);
CREATE INDEX IF NOT EXISTS announcements_status_idx ON announcements(status);

CREATE UNIQUE INDEX IF NOT EXISTS announcements_slug_key ON announcements(slug) WHERE slug IS NOT NULL;

ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS updated_by UUID;

UPDATE announcements
SET updated_at = now()
WHERE updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'announcements_updated_by_fkey'
  ) THEN
    ALTER TABLE announcements
    ADD CONSTRAINT announcements_updated_by_fkey
    FOREIGN KEY (updated_by)
    REFERENCES users(id)
    ON DELETE SET NULL;
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- 11. EVIDENCE GALLERY
CREATE TABLE IF NOT EXISTS evidence_gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  before_image_url TEXT NOT NULL,
  after_image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'pending_approval', 'published')),
  review_note TEXT,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_gallery_sort_order_idx ON evidence_gallery(sort_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS evidence_gallery_category_idx ON evidence_gallery(category);
CREATE INDEX IF NOT EXISTS evidence_gallery_status_idx ON evidence_gallery(status);

ALTER TABLE evidence_gallery
ALTER COLUMN sort_order DROP NOT NULL;

ALTER TABLE evidence_gallery
ALTER COLUMN sort_order DROP DEFAULT;

CREATE OR REPLACE FUNCTION set_evidence_gallery_sort_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO NEW.sort_order
    FROM evidence_gallery;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_evidence_gallery_sort_order_before_insert ON evidence_gallery;
CREATE TRIGGER set_evidence_gallery_sort_order_before_insert
BEFORE INSERT ON evidence_gallery
FOR EACH ROW EXECUTE PROCEDURE set_evidence_gallery_sort_order();

DROP TRIGGER IF EXISTS update_evidence_gallery_updated_at ON evidence_gallery;
CREATE TRIGGER update_evidence_gallery_updated_at
BEFORE UPDATE ON evidence_gallery
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 12. VOLUNTEER LOGS
CREATE TABLE IF NOT EXISTS volunteer_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type TEXT NOT NULL,
  hours NUMERIC(4,1) NOT NULL,
  description TEXT,
  verified_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 13. WIKI PAGES
CREATE TABLE IF NOT EXISTS wiki_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content_tiptap_json JSONB DEFAULT '{}'::jsonb,
  author_id UUID REFERENCES users(id),
  category TEXT NOT NULL,
  last_edited_by UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'pending_approval', 'published')),
  review_note TEXT,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wiki_pages_status_idx ON wiki_pages(status);

-- 14. ACTIVITY LOGS (automatic operational timeline)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  title TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  is_relevant BOOLEAN NOT NULL DEFAULT false,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at DESC);

-- 15. NOTIFICATIONS (in-app delivery feed)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('news_update', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_created_at_idx ON notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_recipient_is_read_idx ON notifications(recipient_id, is_read);

-- 16. PUSH SUBSCRIPTIONS (browser push delivery)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  browser_key TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS browser_key TEXT;

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE push_subscriptions
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS endpoint TEXT;

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS subscription JSONB;

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS p256dh TEXT;

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS auth TEXT;

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE push_subscriptions
SET p256dh = COALESCE(p256dh, subscription -> 'keys' ->> 'p256dh')
WHERE p256dh IS NULL;

UPDATE push_subscriptions
SET auth = COALESCE(auth, subscription -> 'keys' ->> 'auth')
WHERE auth IS NULL;

ALTER TABLE push_subscriptions
ALTER COLUMN p256dh DROP NOT NULL;

ALTER TABLE push_subscriptions
ALTER COLUMN auth DROP NOT NULL;

UPDATE push_subscriptions
SET browser_key = COALESCE(browser_key, MD5(COALESCE(endpoint, id::text)))
WHERE browser_key IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'push_subscriptions_endpoint_key'
      AND conrelid = 'push_subscriptions'::regclass
  ) THEN
    ALTER TABLE push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS push_subscriptions_browser_key_idx ON push_subscriptions(browser_key);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_enabled_idx ON push_subscriptions(user_id, is_enabled);

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON push_subscriptions
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 17. SITE SOCIAL LINKS (public footer dock)
CREATE TABLE IF NOT EXISTS site_social_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL UNIQUE CHECK (platform IN ('twitter', 'instagram', 'github', 'linkedin', 'youtube', 'facebook')),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_social_links_enabled_sort_idx ON site_social_links(is_enabled, sort_order);

DROP TRIGGER IF EXISTS update_site_social_links_updated_at ON site_social_links;
CREATE TRIGGER update_site_social_links_updated_at
BEFORE UPDATE ON site_social_links
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

INSERT INTO site_social_links (platform, label, url, is_enabled, sort_order)
VALUES
  ('twitter', 'Twitter/X', 'https://x.com/', true, 1),
  ('instagram', 'Instagram', 'https://instagram.com/', true, 2),
  ('github', 'GitHub', 'https://github.com/', true, 3),
  ('linkedin', 'LinkedIn', 'https://linkedin.com/', true, 4),
  ('youtube', 'YouTube', 'https://youtube.com/', true, 5),
  ('facebook', 'Facebook', 'https://facebook.com/', true, 6)
ON CONFLICT (platform) DO NOTHING;

-- 18. CONTACT MESSAGES (dashboard inbox copy of contact-form submissions)
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. EMAIL LOGS (Mail Log: one row per email sent via Resend)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL DEFAULT 'general',
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  resend_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_logs_created_at_idx ON email_logs(created_at DESC);

CREATE OR REPLACE FUNCTION prune_activity_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM activity_logs
  WHERE is_relevant = false
    AND created_at < now() - interval '2 days';

  RETURN NULL;
END;
$$;

-- 17. MAINTENANCE FUNCTIONS
CREATE OR REPLACE FUNCTION cleanup_activity_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_rows INTEGER;
BEGIN
  DELETE FROM activity_logs
  WHERE is_relevant = false
    AND created_at < now() - interval '2 days';

  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  RETURN deleted_rows;
END;
$$;

DROP TRIGGER IF EXISTS prune_activity_logs_after_write ON activity_logs;
CREATE TRIGGER prune_activity_logs_after_write
AFTER INSERT OR UPDATE ON activity_logs
FOR EACH STATEMENT
EXECUTE PROCEDURE prune_activity_logs();

-- Trigger for wiki_pages.updated_at
DROP TRIGGER IF EXISTS update_wiki_pages_updated_at ON wiki_pages;
CREATE TRIGGER update_wiki_pages_updated_at
BEFORE UPDATE ON wiki_pages
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE severity_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_pages FORCE ROW LEVEL SECURITY;
ALTER TABLE activity_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

-- Allow public read access to essential reference tables
DROP POLICY IF EXISTS "Public read access to campus_zones" ON campus_zones;
DROP POLICY IF EXISTS "Public read access to severity_criteria" ON severity_criteria;
CREATE POLICY "Public read access to campus_zones" ON campus_zones FOR SELECT USING (true);
CREATE POLICY "Public read access to severity_criteria" ON severity_criteria FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read site social links" ON site_social_links;
DROP POLICY IF EXISTS "Admins can manage site social links" ON site_social_links;
CREATE POLICY "Public can read site social links" ON site_social_links FOR SELECT USING (true);
CREATE POLICY "Admins can manage site social links" ON site_social_links FOR ALL USING (
  get_my_role() IN ('admin', 'owner')
) WITH CHECK (
  get_my_role() IN ('admin', 'owner')
);

-- Defects: Public can report, public can see (anonymous basic details)
DROP POLICY IF EXISTS "Public can view defects" ON defects;
DROP POLICY IF EXISTS "Public can insert defects" ON defects;
DROP POLICY IF EXISTS "Members can update defects" ON defects;
CREATE POLICY "Public can view defects" ON defects FOR SELECT USING (true);
CREATE POLICY "Public can insert defects" ON defects FOR INSERT WITH CHECK (true);
CREATE POLICY "Members can update defects" ON defects FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public can view evidence gallery" ON evidence_gallery;
DROP POLICY IF EXISTS "Evidence gallery editors can manage evidence" ON evidence_gallery;
DROP POLICY IF EXISTS "Authors can view own evidence submissions" ON evidence_gallery;
DROP POLICY IF EXISTS "Evidence editors can view evidence" ON evidence_gallery;
DROP POLICY IF EXISTS "Evidence editors can insert evidence" ON evidence_gallery;
DROP POLICY IF EXISTS "Members can submit evidence" ON evidence_gallery;
DROP POLICY IF EXISTS "Approvers can update evidence" ON evidence_gallery;
DROP POLICY IF EXISTS "Evidence editors can update published evidence" ON evidence_gallery;
DROP POLICY IF EXISTS "Authors can update own evidence" ON evidence_gallery;
DROP POLICY IF EXISTS "Evidence editors can delete evidence" ON evidence_gallery;
DROP POLICY IF EXISTS "Authors can delete own evidence drafts" ON evidence_gallery;
-- Public board only ever shows published, active items.
CREATE POLICY "Public can view evidence gallery" ON evidence_gallery FOR SELECT USING (is_active = true AND status = 'published');
-- Authors can read their own submissions (the manager lists them).
CREATE POLICY "Authors can view own evidence submissions" ON evidence_gallery FOR SELECT USING (created_by = auth.uid());
-- Gallery editors and approvers can read every item (the manager is the review queue).
CREATE POLICY "Evidence editors can view evidence" ON evidence_gallery FOR SELECT USING (get_my_role() IN ('documentation_officer', 'admin', 'owner'));
-- Insert: evidence editors (documentation/admin/owner) may publish directly;
-- every other member except applicants may only insert drafts or submissions.
CREATE POLICY "Evidence editors can insert evidence" ON evidence_gallery FOR INSERT WITH CHECK (get_my_role() IN ('documentation_officer', 'admin', 'owner'));
CREATE POLICY "Members can submit evidence" ON evidence_gallery FOR INSERT WITH CHECK (
  get_my_role() IS NOT NULL AND get_my_role() NOT IN ('applicant', 'documentation_officer', 'admin', 'owner')
  AND status IN ('draft', 'pending_approval')
);
-- Update: approvers any row; evidence editors may only edit published rows and may
-- not change their status; authors may edit their own rows but the new status must
-- stay draft/pending.
CREATE POLICY "Approvers can update evidence" ON evidence_gallery FOR UPDATE USING (get_my_role() IN ('owner', 'admin'));
CREATE POLICY "Evidence editors can update published evidence" ON evidence_gallery FOR UPDATE
  USING (get_my_role() = 'documentation_officer' AND status = 'published')
  WITH CHECK (get_my_role() = 'documentation_officer' AND status = 'published');
CREATE POLICY "Authors can update own evidence" ON evidence_gallery FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid() AND status IN ('draft', 'pending_approval'));
-- Delete: editors/approvers as before, plus authors may withdraw their own drafts/pending.
CREATE POLICY "Evidence editors can delete evidence" ON evidence_gallery FOR DELETE USING (get_my_role() IN ('documentation_officer', 'admin', 'owner'));
CREATE POLICY "Authors can delete own evidence drafts" ON evidence_gallery FOR DELETE USING (created_by = auth.uid() AND status IN ('draft', 'pending_approval'));

-- Applications: Applicants can insert and read their own. Admins/Technical Officers can do everything.
DROP POLICY IF EXISTS "Applicants can read own application" ON applications;
DROP POLICY IF EXISTS "Anyone can submit application" ON applications;
DROP POLICY IF EXISTS "Admins read all applications" ON applications;
DROP POLICY IF EXISTS "Admins update applications" ON applications;
CREATE POLICY "Applicants can read own application" ON applications FOR SELECT USING (email = (auth.jwt() ->> 'email'));
CREATE POLICY "Anyone can submit application" ON applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read all applications" ON applications FOR SELECT USING (get_my_role() IN ('technical_officer', 'president', 'admin', 'owner'));
CREATE POLICY "Admins update applications" ON applications FOR UPDATE USING (get_my_role() IN ('technical_officer', 'president', 'admin', 'owner'));

-- Users: Read profiles based on role. Full list visible to members.
DROP POLICY IF EXISTS "Anyone can read active members" ON users;
DROP POLICY IF EXISTS "Users can edit their own profile" ON users;
CREATE POLICY "Anyone can read active members" ON users FOR SELECT USING (status = 'active');
CREATE POLICY "Users can edit their own profile" ON users FOR UPDATE USING (id = auth.uid());

DROP TRIGGER IF EXISTS protect_user_self_updates_before_update ON users;
CREATE TRIGGER protect_user_self_updates_before_update
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE protect_user_self_updates();

-- Intake cycles: public can view active cycles; authorized roles can manage cycles.
DROP POLICY IF EXISTS "Public can view active intake cycles" ON intake_cycles;
DROP POLICY IF EXISTS "Authorized members can manage intake cycles" ON intake_cycles;
CREATE POLICY "Public can view active intake cycles" ON intake_cycles FOR SELECT USING (is_active = true OR auth.uid() IS NOT NULL);
CREATE POLICY "Authorized members can manage intake cycles" ON intake_cycles FOR ALL USING (
  get_my_role() IN ('technical_officer', 'president', 'admin', 'owner')
) WITH CHECK (
  get_my_role() IN ('technical_officer', 'president', 'admin', 'owner')
);

-- Assessments: Field Officers can create/read for their zone; others read all
DROP POLICY IF EXISTS "Members can view assessments" ON assessments;
DROP POLICY IF EXISTS "Field officers can insert assessments" ON assessments;
CREATE POLICY "Members can view assessments" ON assessments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Field officers can insert assessments" ON assessments FOR INSERT WITH CHECK (auth.uid() = officer_id);

-- Defect history: members can view; authenticated actors can append their own status changes.
DROP POLICY IF EXISTS "Members can view defect history" ON defect_history;
DROP POLICY IF EXISTS "Members can insert defect history" ON defect_history;
CREATE POLICY "Members can view defect history" ON defect_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Members can insert defect history" ON defect_history FOR INSERT WITH CHECK (
  auth.uid() = changed_by
);

-- Reports: Published reports public. All reports visible to members.
DROP POLICY IF EXISTS "Public view published reports" ON reports;
DROP POLICY IF EXISTS "Members view all reports" ON reports;
DROP POLICY IF EXISTS "Members can insert reports" ON reports;
CREATE POLICY "Public view published reports" ON reports FOR SELECT USING (status = 'published');
CREATE POLICY "Members view all reports" ON reports FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Members can insert reports" ON reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Volunteer logs: members can view and write own logs; admins can view all.
DROP POLICY IF EXISTS "Members can view volunteer logs" ON volunteer_logs;
DROP POLICY IF EXISTS "Members can insert own volunteer logs" ON volunteer_logs;
DROP POLICY IF EXISTS "Members can update own volunteer logs" ON volunteer_logs;
CREATE POLICY "Members can view volunteer logs" ON volunteer_logs FOR SELECT USING (
  auth.uid() = member_id OR get_my_role() IN ('admin', 'owner')
);
CREATE POLICY "Members can insert own volunteer logs" ON volunteer_logs FOR INSERT WITH CHECK (
  auth.uid() = member_id
);
CREATE POLICY "Members can update own volunteer logs" ON volunteer_logs FOR UPDATE USING (
  auth.uid() = member_id OR get_my_role() IN ('admin', 'owner')
) WITH CHECK (
  auth.uid() = member_id OR get_my_role() IN ('admin', 'owner')
);

-- Announcements: Public if marked public AND published. Members view all.
-- Approvers publish directly; every other member submits for approval.
DROP POLICY IF EXISTS "Public view public announcements" ON announcements;
DROP POLICY IF EXISTS "Members view all announcements" ON announcements;
DROP POLICY IF EXISTS "Authorized members can insert announcements" ON announcements;
DROP POLICY IF EXISTS "Approvers can insert announcements" ON announcements;
DROP POLICY IF EXISTS "Members can submit announcements" ON announcements;
DROP POLICY IF EXISTS "Authorized members can update announcements" ON announcements;
DROP POLICY IF EXISTS "Approvers can update announcements" ON announcements;
DROP POLICY IF EXISTS "Content editors can update published announcements" ON announcements;
DROP POLICY IF EXISTS "Authors can update own drafts and pending announcements" ON announcements;
DROP POLICY IF EXISTS "Authorized members can delete announcements" ON announcements;
CREATE POLICY "Public view public announcements" ON announcements FOR SELECT USING (visibility = 'public' AND status = 'published');
CREATE POLICY "Members view all announcements" ON announcements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Approvers can insert announcements" ON announcements FOR INSERT WITH CHECK (get_my_role() IN ('owner', 'admin'));
CREATE POLICY "Members can submit announcements" ON announcements FOR INSERT WITH CHECK (
  get_my_role() IS NOT NULL AND get_my_role() NOT IN ('applicant', 'owner', 'admin')
  AND status IN ('draft', 'pending_approval')
);
CREATE POLICY "Approvers can update announcements" ON announcements FOR UPDATE USING (get_my_role() IN ('owner', 'admin'));
CREATE POLICY "Content editors can update published announcements" ON announcements FOR UPDATE
  USING (get_my_role() IN ('president', 'advocacy_officer') AND status = 'published')
  WITH CHECK (get_my_role() IN ('president', 'advocacy_officer') AND status = 'published');
CREATE POLICY "Authors can update own drafts and pending announcements" ON announcements FOR UPDATE
  USING (author_id = auth.uid() AND status IN ('draft', 'pending_approval'))
  WITH CHECK (author_id = auth.uid() AND status IN ('draft', 'pending_approval'));
CREATE POLICY "Authorized members can delete announcements" ON announcements FOR DELETE USING (
  get_my_role() IN ('president', 'admin', 'owner')
);

-- Notifications: members can read their own feed; news publishers can fan out to opted-in users.
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert news notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = recipient_id);
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
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

-- Push subscriptions: users can manage their own browser subscriptions.
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions FOR ALL USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- Wiki pages: members can read published pages; wiki editors publish directly,
-- every other member submits for approval.
DROP POLICY IF EXISTS "Members can view wiki pages" ON wiki_pages;
DROP POLICY IF EXISTS "Authorized members can insert wiki pages" ON wiki_pages;
DROP POLICY IF EXISTS "Wiki editors can insert wiki pages" ON wiki_pages;
DROP POLICY IF EXISTS "Members can submit wiki pages" ON wiki_pages;
DROP POLICY IF EXISTS "Authorized members can update wiki pages" ON wiki_pages;
DROP POLICY IF EXISTS "Approvers can update wiki pages" ON wiki_pages;
DROP POLICY IF EXISTS "Wiki editors can update published wiki pages" ON wiki_pages;
DROP POLICY IF EXISTS "Authors can update own wiki pages" ON wiki_pages;
DROP POLICY IF EXISTS "Authorized members can delete wiki pages" ON wiki_pages;
DROP POLICY IF EXISTS "Authors can delete own wiki drafts" ON wiki_pages;
CREATE POLICY "Members can view wiki pages" ON wiki_pages FOR SELECT USING (
  auth.uid() IS NOT NULL AND (status = 'published' OR author_id = auth.uid() OR get_my_role() IN ('owner', 'admin'))
);
CREATE POLICY "Wiki editors can insert wiki pages" ON wiki_pages FOR INSERT WITH CHECK (get_my_role() IN ('documentation_officer', 'president', 'admin', 'owner'));
CREATE POLICY "Members can submit wiki pages" ON wiki_pages FOR INSERT WITH CHECK (
  get_my_role() IS NOT NULL AND get_my_role() NOT IN ('applicant', 'documentation_officer', 'president', 'admin', 'owner')
  AND status IN ('draft', 'pending_approval')
);
CREATE POLICY "Approvers can update wiki pages" ON wiki_pages FOR UPDATE USING (get_my_role() IN ('owner', 'admin'));
CREATE POLICY "Wiki editors can update published wiki pages" ON wiki_pages FOR UPDATE
  USING (get_my_role() IN ('documentation_officer', 'president') AND status = 'published')
  WITH CHECK (get_my_role() IN ('documentation_officer', 'president') AND status = 'published');
CREATE POLICY "Authors can update own wiki pages" ON wiki_pages FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid() AND status IN ('draft', 'pending_approval'));
CREATE POLICY "Authorized members can delete wiki pages" ON wiki_pages FOR DELETE USING (
  get_my_role() IN ('president', 'admin', 'owner')
);
CREATE POLICY "Authors can delete own wiki drafts" ON wiki_pages FOR DELETE USING (author_id = auth.uid() AND status IN ('draft', 'pending_approval'));

-- Activity logs: members read; authenticated users can write their own events.
DROP POLICY IF EXISTS "Members can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Members can insert own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can update activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can delete activity logs" ON activity_logs;
CREATE POLICY "Members can view activity logs" ON activity_logs FOR SELECT USING (auth.uid() IS NOT NULL);
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
CREATE POLICY "Admins can delete activity logs" ON activity_logs FOR DELETE USING (
  get_my_role() IN ('admin', 'owner')
);

-- Contact messages: members can read every message; only the owner can delete one.
-- Inserts come from the contact API via the service-role admin client,
-- which bypasses RLS, so no INSERT policy is needed.
DROP POLICY IF EXISTS "Members can read contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Only owner can delete contact messages" ON contact_messages;
CREATE POLICY "Members can read contact messages" ON contact_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Only owner can delete contact messages" ON contact_messages FOR DELETE USING (get_my_role() = 'owner');

-- Email logs: only owner/admin can read the log. Inserts come from
-- sendEmail via the service-role admin client, which bypasses RLS,
-- so no INSERT policy is needed.
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners and admins can read email logs" ON email_logs;
CREATE POLICY "Owners and admins can read email logs" ON email_logs FOR SELECT USING (get_my_role() IN ('owner', 'admin'));

-- ========================================================
-- GRANTS — table privileges for the PostgREST roles.
-- RLS policies alone are NOT enough: without GRANTs, anon /
-- authenticated / service_role get 401 "permission denied for
-- table ..." on every read, and member-area pages (applications,
-- profile, directory, ...) fail even for the owner.
-- Added 2026-11-27 after the live DB was fixed by hand for the
-- same missing grants. Keep these AFTER all table/policy
-- definitions so they cover every table in the schema.
-- ========================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
