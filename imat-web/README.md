# IMAT Web Platform

IMAT is the Infrastructure Maintenance Awareness Team platform for FUTA. The site helps students and IMAT members report campus defects, publish and track engineering reports, share newsroom updates, manage wiki knowledge, and monitor operational activity from one dashboard.

The public side covers the homepage, about page, evidence gallery, issue tracker, report form, apply page, login, and newsroom. The authenticated side covers the dashboard, defects, reports, campaigns, wiki pages, analytics, and activity tracking.

## What The Project Does

- Lets students and members report infrastructure defects with photos and location details.
- Lets authorized staff generate, view, and manage PDF reports.
- Lets approved officers publish newsroom updates and notify subscribed users.
- Lets members browse public broadcasts, issue history, and evidence.
- Lets authorized roles manage wiki pages and operational notes.
- Logs important actions for accountability and audit history.

## Roles And Access

IMAT uses role-based access across the website and dashboard.

- `admin`: full control over the website, content, user-facing data, and database-backed actions.
- `president`: can publish, update, and delete managed content; also handles high-level oversight.
- `vice_president`: supports leadership and can access member-facing leadership areas, but does not manage content unless granted a role that allows it.
- `advocacy_officer`: can publish and update newsroom content and manage notifications for broadcasts.
- `documentation_officer`: can create and update reports, wiki pages, and documentation content.
- `technical_officer`: can manage technical and operational records where allowed.
- `field_officer`: can create and update field/defect records and related operational entries.
- `faculty_advisor` and `works_dept`: can access their approved areas and review operational data relevant to their duties.
- `member`: a standard logged-in member with member-level access only.

Basic members can view the parts of the website that are available to authenticated users, read published and member-only content that they are allowed to see, and receive notifications if enabled. They cannot update or delete website data unless they are assigned a role that explicitly grants those permissions.

Not every logged-in user will have a staff role. Users without a staff position are treated as basic `member` accounts and only have the standard member privileges.

## Tech Stack

- Next.js 16.2.4 with the App Router
- React 18
- TypeScript
- Tailwind CSS
- Supabase for auth, data, and row-level security
- `@react-pdf/renderer` for report generation
- Framer Motion for animations
- Lucide React for icons

## Running The Project

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` and fill in your environment variables.

Required keys include:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PHOTOS`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_ANNOUNCEMENTS`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

You can also keep optional keys (such as Redis and service role keys) in the same file if enabled in your deployment setup.

3. Run the development server:

```bash
npm run dev
```

4. Open the local URL printed in the terminal. The dev launcher also prints a LAN URL if one is available.

## Useful Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run clean
npm run build:clean
npm run optimize:images
```

## Supabase Setup

Run the SQL in [supabase_schema.sql](../supabase_schema.sql) in your Supabase SQL editor before using the app.

That schema defines the core tables, RLS policies, notifications, activity logs, announcements, wiki pages, and report-related records used by the platform.

For existing projects, re-run the latest schema safely (it uses `IF NOT EXISTS`/`DROP POLICY IF EXISTS` patterns) so role policies stay aligned with current dashboard behavior.

If you are enabling profile pictures and push subscriptions on an existing project, ensure your database has these updates:

```sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
	endpoint text NOT NULL UNIQUE,
	p256dh text NOT NULL,
	auth text NOT NULL,
	created_at timestamptz DEFAULT now()
);
```

## Recent Updates

- Added a full before/after Evidence Gallery system backed by Supabase (`evidence_gallery`) with responsive side-by-side comparison cards.
- Added Evidence Gallery Manager in the dashboard for `admin` and `documentation_officer` roles to edit titles, descriptions, categories, before/after images, active state, and ordering.
- Updated homepage evidence preview to use live gallery data and shorter mobile-first card flow.
- Added optional/automatic `sort_order` behavior for evidence items while keeping manual ordering for pin-to-top control.
- Added richer profile management page with editable name, editable level (200L-500L), avatar upload/remove, and member metadata summary.
- Added collapsible newsroom notification history panel for signed-in members.
- Added shared role hierarchy utility and animated role presentation improvements in homepage organizational teaser.
- Replaced native browser confirms with styled confirmation modals for delete actions in newsroom management and activity moderation flows.
- Added admin-only delete controls on the Activity Timeline and removed activity edit capability to keep the audit trail strict.
- Fixed Next.js 16 dynamic route param handling on affected dashboard pages (`params` Promise handling), removing runtime route errors.
- Added live site stats wiring (homepage + dashboard) via shared API/hook so counters reflect current database state.
- Added public report draft persistence and clear-form control for safer mobile/public submissions.
- Added GPS coordinate capture and persistence in the public defect reporting flow.
- Consolidated newsroom schema compatibility updates into `supabase_schema.sql` for cleaner one-pass setup.

## Main Areas

- Public site: homepage, about, evidence gallery, issue tracker, apply page, login, and newsroom.
- Dashboard: defects, reports, campaigns, wiki, analytics, member directory, and activity timeline.
- Newsroom: public broadcasts with opt-in notifications and edit tracking.
- Reports: PDF report generation with desktop preview and mobile-safe download flow.

## Notes

- The app uses WebP-optimized public images.
- Mobile browsers are treated as a limited PDF-preview environment, so the safe path is download/open instead of inline preview.
- The dev server uses a smarter host/port launcher that can fall back to the next available port if the requested one is busy.
- Keep local debug artifacts (for example ad-hoc API test scripts and JSON dumps) out of commits to avoid noisy deploys.
