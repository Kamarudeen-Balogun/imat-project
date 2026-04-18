# IMAT Website — Full Project Brief
> Infrastructure Maintenance Awareness Team · Federal University of Technology, Akure (FUTA)
> Hosted at: **imatform.vercel.app** | Stack: Next.js 14 (App Router), Supabase, Tailwind CSS, Cloudinary, Vercel

---

## 1. What IMAT Is

IMAT (Infrastructure Maintenance Awareness Team) is a **student-led infrastructure advocacy body** within the Civil Engineering Department at FUTA. It was established in 2026 to bridge the gap between students and university management on campus infrastructure issues.

**Core activities:**
- Quarterly field assessments of campus infrastructure (roads, drains, walkways, buildings)
- Maintaining a live database of campus defects and repair history
- Delivering biannual technical reports with recommendations to the Works & Physical Planning Department
- Running advocacy campaigns and workshops for the broader campus community
- Volunteer maintenance support alongside university technicians

**Org structure:**
- Faculty Advisor (Civil Engineering lecturer)
- President / Team Lead (500L student)
- Vice President (400L student)
- Documentation Officer
- Field Assessment Officer
- Advocacy & Outreach Officer
- Technical Officer

**Membership eligibility:** Civil Engineering students only · 200L–500L · Minimum CGPA 3.0 · Maximum 25 members per intake cycle

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Already on Vercel, SSR + API routes in one |
| Database | Supabase (Postgres) | Relational data, built-in Auth + RLS + Storage + Realtime |
| Auth | Supabase Auth | Row-Level Security per role out of the box |
| Styling | Tailwind CSS | Rapid development, consistent design system |
| Media | Cloudinary | Photo uploads, transformations, before/after comparisons |
| Email | Resend | Transactional email (application acknowledgements, escalation alerts) |
| Maps | Leaflet.js | Campus defect map with pins — open source, no API key billing |
| Forms | React Hook Form + Zod | Multi-step forms with strict validation |
| PDF reports | @react-pdf/renderer | Auto-generated quarterly/biannual assessment reports |
| Charts | Recharts | Analytics dashboard for defect trends |
| Rich text | Tiptap | Member wiki / knowledge base (Notion-like editing) |
| PWA | next-pwa | Offline-capable field forms for poor campus Wi-Fi zones |

**Do NOT use MongoDB** — data is highly relational (applicants → roles, assessments → defects → zones → officers → reports). Postgres with foreign keys handles this natively.

---

## 3. Database Schema

### Core Tables

```sql
-- Campus zones (pre-seeded)
campus_zones (id, name, description, geojson_polygon)
-- e.g. "Hostel Zone A", "Academic Block", "Admin Complex", "Sports Complex", "Main Gate Road"

-- Users / members
users (id, email, full_name, matric_no, level, cgpa, role, status, zone_id, joined_at, created_at)
-- role: 'applicant' | 'field_officer' | 'documentation_officer' | 'advocacy_officer' | 'technical_officer' | 'president' | 'vice_president' | 'faculty_advisor' | 'works_dept' | 'admin'
-- status: 'active' | 'inactive' | 'graduated'

-- Recruitment intake cycles
intake_cycles (id, name, open_date, close_date, max_slots, is_active, created_by)

-- Applications
applications (id, cycle_id, applicant_name, email, matric_no, level, cgpa, department, role_preference_1, role_preference_2, motivation_statement, cv_url, transcript_url, status, reviewed_by, review_notes, created_at)
-- status: 'submitted' | 'under_review' | 'accepted' | 'waitlisted' | 'rejected'
-- department must equal 'Civil Engineering' — enforced at form level AND DB constraint

-- Infrastructure defects
defects (id, title, description, category, defect_type, severity, affected_area_sqm, location_lat, location_lng, campus_zone_id, reported_by, assigned_to, status, photos, created_at, updated_at)
-- category: 'drainage' | 'road' | 'walkway' | 'structure' | 'other'
-- defect_type per category (see defect_types table below)
-- severity: 1=Cosmetic | 2=Minor | 3=Moderate | 4=Critical | 5=Emergency
-- status: 'reported' | 'assessed' | 'escalated' | 'acknowledged_by_works' | 'resolved'

-- Severity criteria (reference table)
severity_criteria (severity_level, label, description, escalation_path, target_resolution_days)
-- 1 Cosmetic: Surface blemish, no structural risk → Note in database → 90 days
-- 2 Minor: Limited functionality impact → Include in next quarterly report → 60 days
-- 3 Moderate: Affects student safety or campus operations → Escalate in biannual report → 30 days
-- 4 Critical: Active hazard, requires urgent attention → Escalate immediately to Works Dept → 7 days
-- 5 Emergency: Imminent structural/safety risk → Notify Faculty Advisor + Works Dept same day → 24 hours

-- Defect status history (audit trail)
defect_history (id, defect_id, old_status, new_status, changed_by, notes, changed_at)

-- Field assessments (formal quarterly assessment records)
assessments (id, defect_id, officer_id, assessment_date, field_notes, measurement_data, recommendations, photos, created_at)
-- measurement_data: JSONB { crack_width_mm, silt_depth_cm, affected_length_m, etc. }

-- Reports (biannual/quarterly)
reports (id, title, period_start, period_end, authored_by, approved_by, status, pdf_url, defects_included, summary_stats, created_at)
-- status: 'draft' | 'review' | 'approved' | 'published'

-- Announcements
announcements (id, title, body, author_id, visibility, published_at)
-- visibility: 'public' | 'members_only'

-- Volunteer log
volunteer_logs (id, member_id, activity_date, activity_type, hours, description, verified_by)

-- Wiki pages (knowledge base)
wiki_pages (id, title, slug, content_tiptap_json, author_id, category, last_edited_by, updated_at)
```

### Defect Types by Category
```
drainage: silted_channel | blocked_grate | cracked_culvert | overgrown_vegetation | collapsed_drain | open_channel_hazard
road: pothole | cracked_surface | erosion | waterlogging | missing_signage | broken_kerb
walkway: cracked_paving | eroded_surface | missing_interlocking | uneven_surface | blocked_access
structure: wall_crack | ceiling_damage | broken_window | exposed_rebar | foundation_issue | roof_damage
```

---

## 4. User Roles & Permissions

| Role | Can See | Can Do |
|---|---|---|
| Public (unauthenticated) | Home, Evidence Gallery, Newsroom, Quick Report form, Public issue tracker | Submit anonymous quick reports |
| Applicant | Application status page | Check their application status |
| Field Officer | Own zone's defect list, assessment form, own volunteer log | Submit defects, complete assessments, log volunteer hours |
| Documentation Officer | All defects, report builder, wiki | Edit reports, manage wiki pages |
| Advocacy Officer | Announcements, campaign pages, member directory | Post announcements, manage campaign pages |
| Technical Officer | Application review dashboard, all defects | Review applications, manage intake cycles |
| President / VP | All of the above | Full member management, approve reports |
| Faculty Advisor | Read-only: everything + approve reports | Approve reports before they go to Works Dept |
| Works Dept | Read-only: escalated defects, published reports | Update defect status to 'acknowledged' or 'resolved' |
| Admin | Everything | User management, system configuration |

**All enforced via Supabase Row-Level Security (RLS) — not just frontend guards.**

---

## 5. Pages & Routes

### Public Routes (no auth required)
```
/                         → Home (hero, impact counter, evidence gallery, about teaser, CTA)
/about                    → Full about page (org chart, officer roles, eligibility, faculty advisor)
/evidence                 → Full before/after evidence gallery with filters
/newsroom                 → Blog / campaign announcements
/newsroom/[slug]          → Individual post
/apply                    → Recruitment portal (multi-step form)
/apply/status             → Check application status by email + matric number
/report                   → Quick Report form (anonymous, for any FUTA student)
/issues                   → Public defect tracker (read-only, shows status of reports)
```

### Auth Routes
```
/auth/login               → Login page
/auth/callback            → Supabase OAuth callback
```

### Member Dashboard Routes (auth required)
```
/dashboard                → Role-aware home (each role sees relevant widgets)
/dashboard/defects        → Defect list (filtered to zone for Field Officers, all for others)
/dashboard/defects/new    → Submit new defect (field assessment form)
/dashboard/defects/[id]   → Defect detail + history timeline
/dashboard/assessments    → Assessment records
/dashboard/reports        → Report builder + list of past reports
/dashboard/reports/[id]   → Individual report (draft editing or published view)
/dashboard/wiki           → Knowledge base
/dashboard/wiki/[slug]    → Individual wiki page
/dashboard/members        → Member directory
/dashboard/announcements  → Internal announcements
/dashboard/volunteer      → Volunteer log
/dashboard/applications   → Application review (Technical Officer / admin only)
/dashboard/intake         → Manage intake cycles (admin only)
/dashboard/settings       → Profile + notification preferences
```

### Works Dept / Faculty Advisor Routes
```
/portal                   → Read-only management portal (separate login, limited access)
/portal/defects           → Live defect database filtered to escalated items
/portal/reports           → Published and approved reports (with PDF download)
/portal/analytics         → Campus analytics dashboard
```

---

## 6. Key Components to Build

### Public-Facing

**HeroSection**
- Headline: "Building a Culture of Care for FUTA Infrastructure"
- Subheadline: IMAT's one-line mission
- Two CTAs: "Apply to Join" (→ /apply) and "Report an Issue" (→ /report)
- Background: Subtle campus imagery or animated geometric pattern

**ImpactCounter**
- Live stats pulled from Supabase on page load (no SSR cache — always fresh)
- Stats: Total defects reported | Assessments completed | Issues resolved | Active members
- Animate numbers counting up on first viewport entry

**EvidenceGallery**
- Before/after photos of real campus defects from the IMAT presentation
- Filter by: All | Drainage | Roads | Walkways | Structures
- Clicking a photo opens a lightbox with defect details and current status
- Photos stored in Cloudinary

**OrgChart** (on /about)
- Visual hierarchy: Faculty Advisor → President → VP → 4 Officer roles
- Each node shows name (once filled), role title, and responsibilities summary

### Recruitment Portal (/apply)

**Multi-step form with these steps:**
1. **Eligibility Check** — Department (must be Civil Engineering), Level (200–500), CGPA (must be ≥ 3.0). If any fail, show a friendly rejection message with the specific reason. Do not proceed to step 2.
2. **Personal Info** — Full name, matric number, phone, email
3. **Academic Details** — Level, CGPA (re-confirmed), current semester
4. **Role Preference** — Ranked selection of up to 2 preferred roles with a brief "why this role" text box
5. **Motivation** — 200–400 word statement (character counter shown)
6. **Document Upload** — CV (PDF, max 2MB) and optionally academic transcript (PDF, max 2MB) via Cloudinary upload
7. **Review & Submit** — Summary of all fields, confirmation checkbox, submit button

On submission: write to `applications` table, send acknowledgement email via Resend, show a success screen with application reference number.

**Validation rules (Zod):**
- `department` must equal "Civil Engineering" exactly
- `level` must be one of: 200, 300, 400, 500
- `cgpa` must be a number between 3.0 and 5.0
- `motivation_statement` must be 200–400 words (count by splitting on spaces)
- `cv_url` is required, `transcript_url` is optional

### Field Assessment Form (most important form)

This is a civil engineering inspection form, not a general feedback form. Build it with care.

**Fields:**
- `category` — Drainage | Road | Walkway | Structure | Other (dropdown)
- `defect_type` — dynamically populated based on category selection (see defect types above)
- `title` — short description (max 80 chars)
- `description` — detailed field notes (textarea, no word limit)
- `severity` — 1–5 scale with the engineering criteria visible inline for each level:
  - 1: Cosmetic — surface blemish, no structural or safety risk
  - 2: Minor — limited functionality impact, not immediately dangerous
  - 3: Moderate — affects student safety or normal campus operations
  - 4: Critical — active hazard, requires urgent Works Dept attention (triggers auto-escalation alert)
  - 5: Emergency — imminent structural or safety risk, notify same day (triggers immediate alert to Faculty Advisor + Works Dept)
- `affected_area_sqm` — number input (square metres)
- `location_lat`, `location_lng` — auto-populated from device GPS with a "Get My Location" button; also manually adjustable on a Leaflet map
- `campus_zone_id` — dropdown, auto-suggested from GPS location if available
- `photos` — up to 5 photos via Cloudinary upload widget; show thumbnail previews

On submit: create defect record, if severity ≥ 4 automatically set status to 'escalated' and send email alert.

### Defect Map

- Leaflet.js map of FUTA campus
- Center coordinates: approximately 7.2985° N, 5.1349° E (FUTA, Akure)
- Pin colors by severity: green (1–2) | amber (3) | red (4–5)
- Pin icons by category: different markers for drainage, road, walkway, structure
- Filter panel: by status, by category, by severity, by zone
- Clicking a pin opens a popup with: title, category, severity badge, status badge, date reported, thumbnail of first photo, link to full defect detail

### PDF Report Generator

Auto-compile from the `reports` table and linked defects. The generated PDF should include:
1. Cover page: IMAT logo, report title, period, authored by, approved by, date
2. Executive summary: key stats (total defects, by category, by severity, resolved vs open)
3. Campus zone breakdown: one section per zone with a table of defects
4. Structural Health Rating: score per zone (0–100) calculated as:
   `zone_score = 100 - sum(defect.severity * weight) / zone_area_factor`
   where weight = [1=1, 2=2, 3=5, 4=10, 5=20] and zone_area_factor normalises by zone size
5. Photo gallery: up to 3 photos per defect, labeled with defect ID and title
6. Recommendations: auto-populated from individual assessment `recommendations` fields
7. Sign-off section with signature lines for President and Faculty Advisor

### Analytics Dashboard (/portal/analytics)

Charts to include:
- Defects reported per month (line chart, 12-month rolling)
- Defects by category (donut chart)
- Defects by zone (horizontal bar chart — which zones have the most issues)
- Severity distribution (stacked bar chart by month — is campus getting better or worse?)
- Average days to resolution (by category)
- Structural Health Rating per zone (scored gauge or bar chart)

---

## 7. Email Notifications (via Resend)

| Trigger | Recipients | Subject |
|---|---|---|
| Application submitted | Applicant | "IMAT application received — reference [ID]" |
| Application status changed | Applicant | "Your IMAT application has been [accepted/rejected/waitlisted]" |
| New defect severity ≥ 4 | Faculty Advisor + Technical Officer | "CRITICAL defect reported: [title]" |
| New defect severity = 5 | Faculty Advisor + President + Works Dept contact | "EMERGENCY: [title] — immediate action required" |
| Defect status changes to 'resolved' | Original reporter (if member) | "Issue resolved: [title]" |
| Report approved by Faculty Advisor | President + Documentation Officer | "Report approved and ready to send" |
| New intake cycle opened | All active members (to share externally) | "IMAT is now accepting applications for [cycle name]" |

---

## 8. PWA Configuration

The field assessment form MUST work offline. Configure `next-pwa` to cache:
- The `/dashboard/defects/new` route and its assets
- Cloudinary upload SDK
- Campus zones data (pre-cached, rarely changes)
- Defect types lookup data

Offline behaviour: form data is stored in IndexedDB (via idb-keyval). A visible "Offline — will sync when connected" banner appears. On reconnect, drafts sync automatically to Supabase and the banner dismisses.

---

## 9. Build Order (Phases)

### Phase 0 — Setup (Weeks 1–2)
- [ ] Supabase project creation and full schema migration
- [ ] Next.js 14 project scaffolded on Vercel with dev/staging/prod environments
- [ ] Supabase RLS policies for all roles
- [ ] Tailwind design tokens (colors, fonts, spacing) matching IMAT brand
- [ ] Cloudinary account setup with upload presets for photos and documents
- [ ] Resend account and email templates

### Phase 1 — Public Website (Weeks 3–5)
- [ ] Home page (hero, impact counter, evidence gallery, org teaser, CTA)
- [ ] /about page
- [ ] /evidence gallery with filters
- [ ] /newsroom (blog list + individual post)
- [ ] Site-wide nav + footer

### Phase 2 — Recruitment Portal (Weeks 6–7)
- [ ] Multi-step /apply form with eligibility gate and all 7 steps
- [ ] Application status check page
- [ ] Admin: intake cycle management
- [ ] Admin: application review dashboard (table, filters, bulk actions)
- [ ] Resend email integration for acknowledgements and status updates

### Phase 3 — Member Portal & Roles (Weeks 8–10)
- [ ] Auth flow (Supabase login, session management, role-aware redirect)
- [ ] Role-specific dashboard home for each of the 8 role types
- [ ] Member directory
- [ ] Announcement board (post + view)
- [ ] Volunteer log (log + view own history)
- [ ] Wiki (Tiptap editor, page list, individual page view)
- [ ] Mentorship pairing suggestion (500L → 200L/300L by role match)

### Phase 4 — Field Assessment Tools (Weeks 11–13)
- [ ] Field assessment form (full civil engineering inspection form)
- [ ] Defect list page with zone-based filtering for Field Officers
- [ ] Defect detail page with status history timeline
- [ ] Campus defect map (Leaflet.js with pins, filters, popups)
- [ ] Severity ≥ 4 auto-escalation + email alert
- [ ] PWA setup for offline form capability

### Phase 5 — Reports & Management Portal (Weeks 14–15)
- [ ] Report builder (select period, linked defects, generate draft)
- [ ] PDF auto-generation via @react-pdf/renderer
- [ ] Structural Health Rating calculation and zone scoring
- [ ] /portal read-only access for Faculty Advisor and Works Dept
- [ ] Analytics dashboard (Recharts) at /portal/analytics
- [ ] Export: PDF, CSV

### Phase 6 — Public Reporting & Advocacy (Weeks 16–17)
- [ ] Anonymous Quick Report form at /report
- [ ] Public issue tracker at /issues (status-only, no internal notes visible)
- [ ] Campaign landing pages (created by Advocacy Officer from dashboard)
- [ ] Dynamic OG social cards for campaigns (Vercel OG)
- [ ] Push notifications via Web Push API (PWA)

### Phase 7 — Advanced Features (Weeks 18+)
- [ ] Formal member handover flow (outgoing officer → incoming officer)
- [ ] Budget tracking module (expenditure log, receipt uploads, financial summary)
- [ ] Alumni network (graduated members stay connected as mentors)
- [ ] AI-assisted defect severity suggestion (OpenAI Vision API on uploaded photo)
- [ ] COREN/NSE-compatible report export format

---

## 10. Important Design Notes

- The site is for a Nigerian university student organisation — it should feel professional and credible, not corporate or Western-startup-generic. Think civil engineering report aesthetics: clean, structured, data-forward.
- IMAT's brand is grounded in physical campus evidence. The homepage should lead with real photos of the defects they've documented, not stock imagery.
- Mobile-first is non-negotiable. The field assessment form will be used outdoors on phones. Every input, button, and photo upload interaction must work flawlessly on a small screen.
- The Works Department and Faculty Advisor portal must be extremely simple. These are non-technical users. No sidebar navigation. Just a table of issues, a status update button, and a PDF download link.
- Defect severity is the most important piece of data in the system. It determines escalation, report priority, and Structural Health Rating. Never let it be a free-text field.

---

## 11. Current State

- Domain/hosting: imatform.vercel.app (Vercel, Next.js)
- Existing functionality: basic application form (imatform.vercel.app)
- What needs to be built: everything described in this brief
- IMAT is newly established (2026), so there is no legacy data to migrate

---

*Brief generated from: IMAT Proposal for Establishment presentation (CVE 507 Group 10, FUTA, 2026)*
