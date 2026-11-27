# IMAT Web Platform (Detailed Documentation)

This README explains the technical thinking behind IMAT, not just how to run it.

Live site: https://imat-futa.vercel.app

## 1. Product Context

IMAT (Infrastructure Maintenance Awareness Team) is a campus operations platform for FUTA.

What we are solving:

- Students report serious infrastructure issues, but follow-up is usually scattered.
- Evidence is not structured, so issue priority becomes subjective.
- Teams need one system where reporting, review, publication, and accountability are connected.

IMAT connects these flows end-to-end.

## 2. Functional Scope

Public-facing:

- Home, About, Members
- Issue tracker and evidence gallery
- Report issue flow
- Apply-to-join flow
- Newsroom and article details
- Contact form wired to Google Apps Script/Google Sheets

Authenticated dashboard:

- Defects management
- Reports and report publishing
- Newsroom management
- Wiki management
- Activity timeline/audit trail
- Profile and social link management

## 3. Engineering Approach

### 3.1 Architecture choices

- Next.js App Router: chosen for route-level control, metadata, and SSR support.
- Supabase: chosen for managed Postgres, auth, and RLS in one platform.
- TypeScript everywhere: reduces runtime mistakes in API and UI contracts.

### 3.2 Security-first defaults

- Input sanitization on write paths.
- Turnstile + honeypot + rate limiting on public forms.
- Role-based guards in app logic and RLS policies.
- Restricted visibility rules for internal vs public newsroom content.

### 3.3 Reliability choices

- Offline-safe report queue behavior for unstable network conditions.
- Realtime + polling fallback for newsroom notifications.
- Clear error messages on form/API failures to reduce silent breakage.

### 3.4 UX choices

- Mobile-first layouts for student users.
- Consistent design tokens across public and dashboard pages.
- Theme-aware controls with improved dark-mode readability.

## 4. SEO And Discoverability Setup

Implemented in app:

- Dynamic sitemap route
- Robots route
- Canonical metadata base
- Search Console verification support via metadata
- Structured data:
  - Organization
  - WebSite
  - Article (news detail pages)

Why this matters:

- Better crawlability
- Cleaner canonical URLs
- Richer SERP understanding for articles and site identity

## 5. Google Integrations

### 5.1 Search Console

- Use URL-prefix property for https://imat-futa.vercel.app
- Verification token is injected using env variable

### 5.2 Vercel Analytics And Speed Insights

- Web Analytics and Speed Insights are enabled through the root layout with the `@vercel/analytics` and `@vercel/speed-insights` packages.
- They do not require a Google Analytics measurement ID or a Google script allowlist in CSP.

### 5.3 Google Sheets Contact Automation

Flow:

1. About form submits to local API route
2. API validates + sanitizes payload
3. API forwards payload to Apps Script Web App
4. Apps Script appends to Google Sheet

Payload fields forwarded:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "purpose": "partnership",
  "subject": "Partnership Request",
  "message": "Can we collaborate with IMAT?",
  "source": "imat-web-about-contact",
  "page": "/about",
  "submittedAt": "2026-04-26T12:00:00.000Z",
  "userAgent": "..."
}
```

Suggested sheet headers:

submittedAt | name | email | purpose | subject | message | source | page | userAgent

## 6. Environment Variables

Required core keys:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
- NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PHOTOS
- NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_ANNOUNCEMENTS
- NEXT_PUBLIC_VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_SUBJECT
- NEXT_PUBLIC_TURNSTILE_SITE_KEY
- TURNSTILE_SECRET_KEY

SEO/analytics/integration keys:

- NEXT_PUBLIC_SITE_URL
- NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
- GOOGLE_APPS_SCRIPT_CONTACT_URL
- GOOGLE_APPS_SCRIPT_APPLY_URL

Optional resilience key:

- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

Email (Resend):

- RESEND_API_KEY
- EMAIL_FROM (default: noreply@imat.codeflowx.dev)

Application emails (application received, acceptance with invite link, rejection) are sent via the Resend REST API from `src/lib/email.ts`. Supabase email is not used for these flows — do not enable Supabase Auth email templates for them.

Local testing note:

- Turnstile bypass is enabled by default outside production.
- To force local Turnstile testing, set NEXT_PUBLIC_TURNSTILE_DEV_BYPASS=false.

## 7. Local Development

Install and run:

```bash
npm install
npm run dev
```

Useful scripts:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run clean
npm run build:clean
npm run optimize:images
```

## 8. Database Setup

Run the SQL in ../supabase_schema.sql before first use.

The schema contains:

- users and role policies
- defects and reports
- announcements and notifications
- activity logs
- wiki and related content tables

For existing projects, rerun the latest schema safely since it uses idempotent patterns where possible.

The owner role (and its last-owner safeguard) can also be applied on its own via `../supabase_migrations/20261127_add_owner_role.sql`.

## 9. News Alerts (Web Push)

IMAT now supports browser push notifications for newsroom announcements.

Implementation summary:

- Browser subscriptions are stored in `push_subscriptions`.
- Push delivery is sent from server code using VAPID keys.
- Service worker handlers display notification cards and open newsroom links on click.

Required setup:

- Run the latest `supabase_schema.sql` so `push_subscriptions` and related policy updates exist.
- Configure these environment variables:
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT`

Local/mobile testing notes:

- Desktop localhost works as a secure context for Push and Notification APIs.
- Mobile access over raw `http://LAN_IP:port` is not a secure context and may report that notifications are unsupported.
- For mobile push testing, use an HTTPS origin (for example a secure tunnel or deployed preview) and allow notifications in browser/site settings.

## 10. Project Files Worth Reading

- history.md for implementation timeline
- src/app for route structure
- src/lib for business logic and safety helpers
- src/components for reusable UI modules

## 11. Why I Built It This Way

I wanted IMAT to feel like a serious operations product, not just a school project with forms. The major design decision was to prioritize reliability and clarity first, then polish.

That is why the platform is structured around:

- verifiable evidence
- role-aware actions
- audit-friendly logs
- search visibility for public transparency

This approach helps stakeholders trust what the system is saying and what actions are actually being taken.
