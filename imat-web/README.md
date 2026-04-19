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

2. Add your environment variables in `.env.local`.

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

## Main Areas

- Public site: homepage, about, evidence gallery, issue tracker, apply page, login, and newsroom.
- Dashboard: defects, reports, campaigns, wiki, analytics, member directory, and activity timeline.
- Newsroom: public broadcasts with opt-in notifications and edit tracking.
- Reports: PDF report generation with desktop preview and mobile-safe download flow.

## Notes

- The app uses WebP-optimized public images.
- Mobile browsers are treated as a limited PDF-preview environment, so the safe path is download/open instead of inline preview.
- The dev server uses a smarter host/port launcher that can fall back to the next available port if the requested one is busy.
