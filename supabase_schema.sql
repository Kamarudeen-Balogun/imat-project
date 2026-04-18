-- ========================================================
-- IMAT Database Schema & Setup
-- Execute this entirely in your Supabase SQL Editor
-- ========================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CAMPUS ZONES (Pre-seeded)
CREATE TABLE campus_zones (
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
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  matric_no TEXT,
  level INTEGER,
  cgpa NUMERIC(3,2),
  role TEXT NOT NULL DEFAULT 'applicant' CHECK (role IN ('applicant', 'field_officer', 'documentation_officer', 'advocacy_officer', 'technical_officer', 'president', 'vice_president', 'faculty_advisor', 'works_dept', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  zone_id UUID REFERENCES campus_zones(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 3. INTAKE CYCLES
CREATE TABLE intake_cycles (
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
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID REFERENCES intake_cycles(id) ON DELETE CASCADE,
  applicant_name TEXT NOT NULL,
  email TEXT NOT NULL,
  matric_no TEXT NOT NULL,
  level INTEGER NOT NULL,
  cgpa NUMERIC(3,2) NOT NULL,
  department TEXT NOT NULL CHECK (department = 'Civil Engineering'),
  role_preference_1 TEXT NOT NULL,
  role_preference_2 TEXT,
  motivation_statement TEXT NOT NULL,
  cv_url TEXT NOT NULL,
  transcript_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'accepted', 'waitlisted', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 5. DEFECTS
CREATE TABLE defects (
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


-- 6. SEVERITY CRITERIA (Reference table)
CREATE TABLE severity_criteria (
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
CREATE TABLE defect_history (
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

CREATE TRIGGER update_defects_updated_at
BEFORE UPDATE ON defects
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- 8. ASSESSMENTS
CREATE TABLE assessments (
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
CREATE TABLE reports (
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


-- 10. ANNOUNCEMENTS
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id UUID REFERENCES users(id),
  visibility TEXT DEFAULT 'members_only' CHECK (visibility IN ('public', 'members_only')),
  published_at TIMESTAMPTZ DEFAULT now()
);


-- 11. VOLUNTEER LOGS
CREATE TABLE volunteer_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type TEXT NOT NULL,
  hours NUMERIC(4,1) NOT NULL,
  description TEXT,
  verified_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 12. WIKI PAGES
CREATE TABLE wiki_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content_tiptap_json JSONB DEFAULT '{}'::jsonb,
  author_id UUID REFERENCES users(id),
  category TEXT NOT NULL,
  last_edited_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger for wiki_pages.updated_at
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
ALTER TABLE volunteer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_cycles ENABLE ROW LEVEL SECURITY;

-- Utility Function: Get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- Allow public read access to essential reference tables
CREATE POLICY "Public read access to campus_zones" ON campus_zones FOR SELECT USING (true);
CREATE POLICY "Public read access to severity_criteria" ON severity_criteria FOR SELECT USING (true);

-- Defects: Public can report, public can see (anonymous basic details)
CREATE POLICY "Public can view defects" ON defects FOR SELECT USING (true);
CREATE POLICY "Public can insert defects" ON defects FOR INSERT WITH CHECK (true);
CREATE POLICY "Members can update defects" ON defects FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Applications: Applicants can insert and read their own. Admins/Technical Officers can do everything.
CREATE POLICY "Applicants can read own application" ON applications FOR SELECT USING (email IN (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Anyone can submit application" ON applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read all applications" ON applications FOR SELECT USING (get_my_role() IN ('technical_officer', 'president', 'admin'));
CREATE POLICY "Admins update applications" ON applications FOR UPDATE USING (get_my_role() IN ('technical_officer', 'president', 'admin'));

-- Users: Read profiles based on role. Full list visible to members.
CREATE POLICY "Anyone can read active members" ON users FOR SELECT USING (status = 'active');
CREATE POLICY "Users can edit their own profile" ON users FOR UPDATE USING (id = auth.uid());

-- Assessments: Field Officers can create/read for their zone; others read all
CREATE POLICY "Members can view assessments" ON assessments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Field officers can insert assessments" ON assessments FOR INSERT WITH CHECK (auth.uid() = officer_id);

-- Reports: Published reports public. All reports visible to members.
CREATE POLICY "Public view published reports" ON reports FOR SELECT USING (status = 'published');
CREATE POLICY "Members view all reports" ON reports FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Members can insert reports" ON reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Announcements: Public if marked public. Members view all.
CREATE POLICY "Public view public announcements" ON announcements FOR SELECT USING (visibility = 'public');
CREATE POLICY "Members view all announcements" ON announcements FOR SELECT USING (auth.uid() IS NOT NULL);
