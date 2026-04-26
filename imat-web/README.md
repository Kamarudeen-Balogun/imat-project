# IMAT Web Platform

## Live Demo (Quick View)

For quick portfolio review and recruiter access:

- **Production URL**: https://imat-futa.vercel.app

IMAT is the Infrastructure Maintenance Awareness Team platform for FUTA. The site helps students and IMAT members report campus defects, publish and track engineering reports, share newsroom updates, manage wiki knowledge, and monitor operational activity from one dashboard.

The public side covers the homepage, about page, evidence gallery, issue tracker, report form, apply page, login, and newsroom. The authenticated side covers the dashboard, defects, reports, campaigns, wiki pages, analytics, and activity tracking.

## Product Highlights

- End-to-end defect reporting workflow with media, location details, and status tracking.
- Role-aware operations dashboard for newsroom, reports, defects, wiki, and activity oversight.
- Public newsroom with browser notifications and visibility-aware content delivery.
- Before/after evidence gallery backed by Supabase data.
- PDF report generation pipeline for structured maintenance documentation.
- Secure-by-default architecture with Supabase RLS and server-side input sanitization.

## Security And Offline Flow

- Public report and apply forms now use Cloudflare Turnstile, honeypots, and rate limiting before server-side inserts are accepted.
- Public reports can still be queued locally when the device is offline, then resumed later after the browser is back online and a fresh Turnstile check is completed.
- Turnstile environment variables should be written as plain `KEY=value` pairs with no spaces around the equals sign.
- If the Cloudflare widget setup will not accept `localhost`, the deployed Vercel hostname is sufficient for production; local testing can still use a supported preview or loopback host that Turnstile accepts.
- Local development now bypasses Turnstile by default (non-production only) so forms remain testable on localhost.
- To force Turnstile during local testing, set `NEXT_PUBLIC_TURNSTILE_DEV_BYPASS=false` in `.env.local` and restart the dev server.
- Production never uses the bypass path; full Turnstile verification remains enforced server-side.

## Access Model

IMAT uses role-based access control for dashboard operations. Core governance roles include `admin`, `president`, `advocacy_officer`, `documentation_officer`, `technical_officer`, and `field_officer`, while non-staff accounts remain `member` with standard read-level privileges.

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
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_TURNSTILE_DEV_BYPASS` (optional, defaults to bypass in non-production unless set to `false`)
- `NEXT_PUBLIC_SITE_URL` (for canonical URLs, sitemap, and robots host)
- `GOOGLE_APPS_SCRIPT_CONTACT_URL` (Web App URL for About contact submissions)
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (optional, but recommended for stronger rate limiting)

You can also keep optional keys (such as Redis and service role keys) in the same file if enabled in your deployment setup.

### Google Sheet Contact Automation

The About page contact form submits to `POST /api/contact`, which forwards to your Google Apps Script Web App.

Expected payload sent to Apps Script:

```json
{
	"name": "Jane Doe",
	"email": "jane@example.com",
	"subject": "Partnership Request",
	"message": "Can we collaborate with IMAT?",
	"source": "imat-web-about-contact",
	"page": "/about",
	"submittedAt": "2026-04-26T12:00:00.000Z",
	"userAgent": "..."
}
```

Your Apps Script should append these fields to a Google Sheet row and return an HTTP 200 response.

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

## Documentation

- Detailed implementation history and technical timeline: [history.md](history.md)
- Database schema and policies: [../supabase_schema.sql](../supabase_schema.sql)
