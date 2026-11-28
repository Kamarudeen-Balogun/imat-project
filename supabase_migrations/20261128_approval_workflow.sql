-- 20261128: approval workflow for member-published content (news, wiki, evidence).
--
-- Every member role (except applicants, who are not members yet) can now submit
-- content, but it only goes live after an owner/admin approves it. Approvers keep
-- direct publish. The pattern is per-table status + review fields, mirroring the
-- applications reviewed_by/reviewed_at pattern.
--
-- Also closes the public draft leak at the RLS layer: the public announcements
-- policy previously matched on visibility alone, so a public-visibility DRAFT
-- showed on the homepage (with a 1/1/1970 date from its null published_at).
-- Public SELECT policies now require status = 'published'.
--
-- Safe to apply while the previous build is live: existing rows default to
-- 'published' (they are already live), and the old code only writes as
-- owner/admin or wiki/evidence editors, whose policies still allow it.

-- ================= ANNOUNCEMENTS =================
ALTER TABLE announcements
  DROP CONSTRAINT IF EXISTS announcements_status_check;
ALTER TABLE announcements
  ADD CONSTRAINT announcements_status_check CHECK (status IN ('draft', 'pending_approval', 'published'));
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS review_note TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS announcements_status_idx ON announcements(status);

-- Public may only ever see published posts.
DROP POLICY IF EXISTS "Public view public announcements" ON announcements;
CREATE POLICY "Public view public announcements" ON announcements FOR SELECT USING (visibility = 'public' AND status = 'published');

-- Insert: approvers (owner/admin) may insert any status; every other member
-- except applicants may only insert drafts or submissions for approval.
DROP POLICY IF EXISTS "Authorized members can insert announcements" ON announcements;
CREATE POLICY "Approvers can insert announcements" ON announcements FOR INSERT WITH CHECK (get_my_role() IN ('owner', 'admin'));
CREATE POLICY "Members can submit announcements" ON announcements FOR INSERT WITH CHECK (
  get_my_role() IS NOT NULL AND get_my_role() NOT IN ('applicant', 'owner', 'admin')
  AND status IN ('draft', 'pending_approval')
);

-- Update: approvers any row; content editors (president/advocacy) may only edit
-- already-published rows and may not change their status (so they cannot publish
-- a draft or approve a pending item from the client); authors may only touch
-- their own drafts/pending items and can never set status to published.
DROP POLICY IF EXISTS "Authorized members can update announcements" ON announcements;
CREATE POLICY "Approvers can update announcements" ON announcements FOR UPDATE USING (get_my_role() IN ('owner', 'admin'));
CREATE POLICY "Content editors can update published announcements" ON announcements FOR UPDATE
  USING (get_my_role() IN ('president', 'advocacy_officer') AND status = 'published')
  WITH CHECK (get_my_role() IN ('president', 'advocacy_officer') AND status = 'published');
CREATE POLICY "Authors can update own drafts and pending announcements" ON announcements FOR UPDATE
  USING (author_id = auth.uid() AND status IN ('draft', 'pending_approval'))
  WITH CHECK (author_id = auth.uid() AND status IN ('draft', 'pending_approval'));

-- ================= WIKI PAGES =================
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'pending_approval', 'published'));
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS review_note TEXT;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS wiki_pages_status_idx ON wiki_pages(status);

-- Members see published pages, their own drafts/pending, and approvers see all.
DROP POLICY IF EXISTS "Members can view wiki pages" ON wiki_pages;
CREATE POLICY "Members can view wiki pages" ON wiki_pages FOR SELECT USING (
  auth.uid() IS NOT NULL AND (status = 'published' OR author_id = auth.uid() OR get_my_role() IN ('owner', 'admin'))
);

-- Insert: wiki editors (documentation/president/admin/owner) may publish directly;
-- every other member except applicants may only insert drafts or submissions.
DROP POLICY IF EXISTS "Authorized members can insert wiki pages" ON wiki_pages;
CREATE POLICY "Wiki editors can insert wiki pages" ON wiki_pages FOR INSERT WITH CHECK (get_my_role() IN ('documentation_officer', 'president', 'admin', 'owner'));
CREATE POLICY "Members can submit wiki pages" ON wiki_pages FOR INSERT WITH CHECK (
  get_my_role() IS NOT NULL AND get_my_role() NOT IN ('applicant', 'documentation_officer', 'president', 'admin', 'owner')
  AND status IN ('draft', 'pending_approval')
);

-- Update: approvers any row; wiki editors may only edit published rows and may not
-- change their status; authors may edit their own rows but the new status must stay
-- draft/pending (so an edit to a published page sends it back for approval).
DROP POLICY IF EXISTS "Authorized members can update wiki pages" ON wiki_pages;
CREATE POLICY "Approvers can update wiki pages" ON wiki_pages FOR UPDATE USING (get_my_role() IN ('owner', 'admin'));
CREATE POLICY "Wiki editors can update published wiki pages" ON wiki_pages FOR UPDATE
  USING (get_my_role() IN ('documentation_officer', 'president') AND status = 'published')
  WITH CHECK (get_my_role() IN ('documentation_officer', 'president') AND status = 'published');
CREATE POLICY "Authors can update own wiki pages" ON wiki_pages FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid() AND status IN ('draft', 'pending_approval'));

-- Delete: as before, plus authors may withdraw their own drafts/pending pages.
DROP POLICY IF EXISTS "Authorized members can delete wiki pages" ON wiki_pages;
CREATE POLICY "Authorized members can delete wiki pages" ON wiki_pages FOR DELETE USING (get_my_role() IN ('president', 'admin', 'owner'));
CREATE POLICY "Authors can delete own wiki drafts" ON wiki_pages FOR DELETE USING (author_id = auth.uid() AND status IN ('draft', 'pending_approval'));

-- ================= EVIDENCE GALLERY =================
ALTER TABLE evidence_gallery ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'pending_approval', 'published'));
ALTER TABLE evidence_gallery ADD COLUMN IF NOT EXISTS review_note TEXT;
ALTER TABLE evidence_gallery ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE evidence_gallery ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS evidence_gallery_status_idx ON evidence_gallery(status);

-- Public board only ever shows published, active items.
DROP POLICY IF EXISTS "Public can view evidence gallery" ON evidence_gallery;
CREATE POLICY "Public can view evidence gallery" ON evidence_gallery FOR SELECT USING (is_active = true AND status = 'published');

-- Authors can read their own submissions (the manager lists them).
CREATE POLICY "Authors can view own evidence submissions" ON evidence_gallery FOR SELECT USING (created_by = auth.uid());

-- Gallery editors and approvers can read every item (the manager is the review queue).
CREATE POLICY "Evidence editors can view evidence" ON evidence_gallery FOR SELECT USING (get_my_role() IN ('documentation_officer', 'admin', 'owner'));

DROP POLICY IF EXISTS "Evidence gallery editors can manage evidence" ON evidence_gallery;

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
