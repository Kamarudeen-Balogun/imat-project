# IMAT Project History

This is the living implementation history for the IMAT web platform.

## Project Snapshot

- Stack: Next.js 16.2.4 (App Router), TypeScript, Tailwind CSS, Supabase SSR/Auth/DB.
- Focus: infrastructure maintenance reporting, issue tracking, newsroom publishing, role-based dashboard operations, and evidence/report workflows.
- Deployment target: Vercel.

## Timeline Of Implementations

### 1) Foundation And Core App Structure

- Set up App Router pages and route groups for public pages and secured dashboard sections.
- Added global layout with shared navigation/footer and centralized theme provider.
- Established Supabase client wiring for browser/server usage.

### 2) Authentication, Access Control, And Session Handling

- Implemented login flow and protected dashboard/portal routes.
- Hardened middleware route checks and role-aware authorization for sensitive operations.
- Migrated Supabase SSR cookie handling to current `getAll/setAll` approach to fix compatibility issues.

### 3) Defects, Reports, And Evidence Workflows

- Added defects listing and detail pages (including create/new pathways).
- Added reports module with report listing, detail view, and report generation flow.
- Added PDF rendering support for report output.
- Added evidence and issue-related pages to support inspection/reporting process.

### 4) Newsroom And Content Discoverability

- Implemented newsroom listing and dynamic article detail routes.
- Improved discoverability by fixing/adding links to newsroom/campaign-related content.
- Addressed stale rendering behavior on dynamic content routes.

### 5) Data Integrity, UX Reliability, And Hydration Fixes

- Resolved hydration and cache-related inconsistencies.
- Applied rendering/caching adjustments to reduce stale client/server mismatches.
- Improved role-sensitive behavior and general UI consistency for authenticated areas.

### 6) Security Hardening

- Added stricter HTTP security headers in Next.js config:
  - Content Security Policy
  - HSTS
  - X-Frame-Options
  - X-Content-Type-Options
  - Referrer-Policy
  - Permissions-Policy
- Applied long-lived cache headers for static assets where appropriate.

### 7) Performance Optimization Pass

- Added image optimization pipeline script:
  - `scripts/optimize-public-images.mjs`
  - Converts JPG/PNG assets in public images directory to optimized WebP.
- Added build utility script:
  - `scripts/clean-next-cache.mjs`
- Updated npm scripts:
  - `optimize:images`
  - `clean`
  - `build:clean`
- Switched key gallery/public image references from JPG to WebP in pages.
- Added responsive `sizes` hints to `next/image` usage on heavy image pages.
- Deferred non-critical toast UI load using a client-only dynamic component (`ClientToaster`).
- Build validated successfully after optimization pass.

### 8) Service Worker Cleanup Migration

- Added one-time service worker/cache cleanup component to unregister legacy service workers and clear old caches on client load.
- Kept web app manifest metadata active for installable app metadata.

### 9) PWA Decommission + Responsive UI Upgrade (Latest)

- Removed legacy PWA/migration pieces no longer needed for runtime:
  - Removed `next-pwa` dependency from package manifest and lockfile.
  - Removed `public/manifest.json` and related metadata references from root layout.
  - Removed one-time `ServiceWorkerCleanup` component from app layout.
- Upgraded responsive behavior across shared layout and key public pages:
  - Rebuilt mobile hamburger experience with animated overlay/panel, stronger visual styling, and clearer action buttons.
  - Improved navbar spacing/truncation behavior across screen sizes.
  - Added mobile drawer navigation for dashboard routes.
  - Improved page paddings/typography on Home, Report, Apply, Issues, and Footer for better small-screen usability.
  - Added global guardrails (`overflow-x` handling, media max-width rules, text rendering polish) for consistent cross-device layout.
- Validation: build completed successfully after these updates.

### 10) Reporting, Newsroom, And Mobile Compatibility Pass

- Hardened the report PDF workflow for mobile devices by replacing viewport-only detection with a stronger device-capability check.
- Kept desktop inline PDF preview intact while routing mobile users to a download-first fallback for better reliability.
- Updated the shared PDF/report renderer to keep Cloudinary-hosted images and report attachments flowing into the generated document.
- Added CSP support for blob-based previewing and Cloudinary fetches so PDF rendering and remote media loading are less likely to fail.
- Added activity logging around major actions such as defect creation, defect status changes, report publishing, announcement publishing, and wiki edits.
- Added newsroom delivery features:
  - announcement slugs and canonical newsroom URLs
  - public newsroom listing and article pages
  - browser notification opt-in and polling for unread alerts
  - notification fan-out for opted-in users when broadcasts are published
- Added an activity timeline page in the dashboard to surface recent system events.
- Added a knowledge base/wiki area for operational notes, runbooks, and internal guidance.
- Added a smarter dev launcher that binds on `0.0.0.0`, prints localhost and LAN URLs, and automatically moves to the next free port if the requested one is busy.
- Verification: recent report-file edits were checked and returned no errors.

### 11) Content Management, Permissions, And Log Retention

- Added a newsroom manager area under the dashboard for content editors to review, edit, and remove published broadcasts from both the website and database.
- Added an announcement editor workflow that preserves the original public slug, updates the public timestamp when content changes, and records the user who made the edit.
- Added announcement delete support with controlled role access so only higher-trust members can remove posts entirely.
- Refreshed announcement notifications when a post changes so recipients see corrected text instead of stale copies.
- Added explicit role-based access helpers so newsroom, wiki, and content management screens can share the same permission rules.
- Extended the wiki editor with delete support and kept write/delete permissions limited to the intended roles.
- Added announcement update metadata to the public newsroom page so members can see who last edited a post and when it was changed.
- Added relevant activity logging for news, report, defect, and wiki operations so major changes remain auditable.
- Added a retention rule for activity logs that prunes non-relevant records older than two days through both database cleanup and request-time cleanup.
- Added a newsroom management quick action in the dashboard so editors can jump directly into content moderation.
- Verification: the changed TypeScript files were rechecked and reported no errors.

### 12) Documentation Update For Roles

- Updated the README to document the website role model and the default `member` account behavior.
- Clarified that not every user receives a staff role; users without one are treated as basic members with view-level access only.
- Documented the main permission boundaries so update/delete actions remain restricted to the appropriate roles.

### 13) Project Overview Documentation Refresh

- Replaced the default starter README copy with an IMAT-specific project overview.
- Documented the main public and dashboard areas, the actual run instructions, and the Supabase schema prerequisite.
- Kept the README aligned with the current role model, mobile PDF behavior, and dev-server workflow.

### 14) Data Sync, Reporting Reliability, And Public Form Resilience

- Replaced hardcoded homepage/dashboard counters with a shared live stats API + hook.
- Added refresh-safe public report draft persistence and manual clear-form action.
- Added GPS coordinate capture in public reporting and persisted `location_lat`/`location_lng` through queue/API/database insert flow.
- Improved service-worker sync registration handling for safer offline/public upload retries.

### 15) Newsroom Stability, Routing, And Manager UX

- Resolved newsroom detail 404 regressions by hardening slug/detail resolution and Next.js dynamic route handling.
- Standardized compact/canonical newsroom URLs and applied slug backfill support for legacy content.
- Removed brittle newsroom dependencies on missing optional columns in runtime queries.
- Updated newsroom listing behavior so signed-in users can see both public and members-only items.
- Improved newsroom manager cards with thumbnails, direct visibility toggles, and direct delete controls.
- Added styled custom delete confirmation flows to avoid accidental destructive actions.

### 16) Activity Moderation Tightening And Schema Consolidation

- Added admin-only delete control to the activity timeline with explicit confirmation modal.
- Removed activity-log edit capability to preserve stricter operational history integrity.
- Added/adjusted activity-log RLS policy coverage in `supabase_schema.sql` to match app behavior.
- Merged newsroom schema compatibility patching into `supabase_schema.sql` so setup can be run from one canonical schema file.
- Revalidated builds after each pass; current build state is successful.

### 17) Members, Roles, And Profile Management Expansion

- Introduced a shared role hierarchy module for consistent ordering and labeling across homepage/member-facing views.
- Updated role hierarchy so `admin` is top-priority and role ordering remains stable even when some leadership roles are missing.
- Reworked member presentation on homepage and members directory with clearer avatars, stronger card hierarchy, and responsive role-first sorting.
- Added richer profile management under the dashboard:
  - editable full name
  - editable academic level (200L-500L)
  - avatar upload/remove with Cloudinary
  - joined/status summary display

### 18) Newsroom Notification UX And Delivery Reliability

- Strengthened in-browser newsroom notifications with realtime Supabase channel subscription for immediate delivery.
- Kept polling fallback to improve reliability when realtime events are delayed.
- Added a collapsible notification history panel in the newsroom so members can scan recent alerts without searching long page text.

### 19) Evidence Gallery 2.0 (Before/After + Editorial Workflow)

- Replaced static evidence cards with database-backed before/after gallery items from `evidence_gallery`.
- Added a dedicated dashboard Evidence Gallery Manager accessible to `admin` and `documentation_officer` roles.
- Enabled editing of gallery title, description, category, before/after images, active visibility, and ordering.
- Added optional automatic sort ordering:
  - new records auto-append when sort order is blank
  - manual order still supported to pin priority items at top/homepage preview
- Improved mobile experience by reducing homepage evidence preview length and using horizontal card flow with side-by-side media comparison.

### 20) Full Redesign Program Kickoff (Futuristic UI + Security + AI Memory)

- Started the complete visual redesign initiative for IMAT with a futuristic, glass-layered interface direction and stronger responsive behavior.
- Reworked global design tokens in `src/app/globals.css`:
  - new electric-blue/amber/mint palette
  - atmospheric radial/gradient background system
  - shared `glass-panel` and animated `futuristic-grid` utilities
- Updated root shell in `src/app/layout.tsx` and redesigned shared navigation/footer components for cleaner hierarchy and improved mobile action flow.
- Rebuilt homepage (`src/app/page.tsx`) into a modern operations-style landing experience while preserving live data wiring and existing route integrations.
- Added a formal redesign program document at `docs/redesign-plan.md` with phased delivery strategy.
- Added security CI workflow at `.github/workflows/security-checks.yml` to run:
  - Gitleaks secret scanning
  - GitHub CodeQL static analysis
  - npm high-severity dependency audit and lint checks
- Added local security scripts in `package.json`:
  - `security:audit`
  - `security:full`
- Added typed long-chat memory scaffolding at `src/lib/ai/memorySchema.ts` with:
  - tiered memory model (`working`, `episodic`, `semantic`)
  - message windowing helper
  - snapshot normalization helper
  - structured summarization prompt input helper
- Updated README with redesign/security/memory architecture documentation.
- Fixed a pre-existing lint blocker in `src/app/report/page.tsx` by stabilizing background sync callback usage and effect dependencies.
- Corrected site stats semantics so homepage counters align with issue tracker reality:
  - `Defects Reported` now counts total submitted defects (all statuses)
  - replaced `Assessments Completed` with `Under Assessment`
  - `Under Assessment` now tracks in-progress defect statuses (`assessed`, `escalated`)
- Removed duplicated top metrics row in homepage hero to avoid repeating counters already shown in the live metrics section.
- Corrected footer wording to use the exact IMAT meaning: Infrastructure Maintenance Awareness Team.
- Added layered/partial-blur hero background image treatment on homepage while keeping existing FUTA network wording intact.
- Removed the homepage background image after review and returned the hero to a clean no-image layout with the same text hierarchy.
- Removed all static files from `public/images` after confirming no source references remained, and converted the evidence gallery to database-only uploads without static fallback images.
- Added explicit IMAT meaning line at the top of homepage hero (`IMAT = Infrastructure Maintenance Awareness Team`).
- Retuned dark theme palette to a cooler teal-slate tone while keeping light theme as default preference.
- Expanded redesign coverage across all top-level website pages and dashboard shell for full-site visual consistency:
  - public pages: home, about, evidence, issues, members, newsroom, report, apply, login
  - dashboard shared layout and dashboard landing cards
- Installed `@tailwindcss/forms` to improve the consistency of form controls across the redesigned site.
- Removed the leftover root-level `D:\IMAT\background.png` source asset after the homepage was switched back to a no-image layout.
- Verification status:
  - lint now passes with warnings only (no errors)
  - production build completes successfully

### 21) UI/UX Accessibility And Modernization Pass

- Upgraded color system in `globals.css` for improved WCAG AA contrast compliance:
  - Light mode: darker text (`--textDefault: #0a1628`) and adjusted primary blue (`#0284c7`)
  - Dark mode: deeper backgrounds with better contrast ratios
- Added comprehensive CSS utilities:
  - `skeleton-shimmer` - animated loading placeholders with gradient animation
  - `animate-pulse-glow`, `animate-float`, `animate-spin-slow` - new animation keyframes
  - `focus-ring`, `focus-ring-primary`, `focus-ring-accent` - keyboard focus indicators
  - `btn-press` - button active/press states (scale + opacity feedback)
  - `scrollbar-thin` - custom styled scrollbars
- Extended `tailwind.config.ts` with:
  - Custom shadows: glow, glow-lg, glow-accent, glow-success, inner-glow
  - Animation definitions
  - Bounce-in easing curve
- Created shared animation variants library at `src/lib/animations.ts`:
  - sectionReveal, fadeIn, fadeInUp, fadeInDown, scaleIn
  - slideInLeft, slideInRight, staggerContainer, staggerItem
  - modalVariants, dropdownVariants, toastVariants, tabVariants
  - useAnimationPrefs hook for reduced-motion preference
- Created reusable UI component tokens at `src/lib/ui.ts`:
  - buttonStyles with base/sizes/variants
  - cardStyles with hover/interactive states
  - inputStyles with error/success states
  - badgeStyles variants
  - skeletonStyles
  - sectionHeading and statCard styles
- Added new components:
  - `src/components/EmptyState.tsx` - animated empty states with icons (inbox, users, images, defects, files)
  - `src/components/layout/Breadcrumbs.tsx` - auto-generated breadcrumbs with PageHeading
- Added clsx dependency for cleaner className composition.
- Verification: lint passes with 0 errors.

### 22) Newsroom Access Expansion, Policy Enforcement, And Documentation Split

- Expanded newsroom notifications to support guest usage:
  - local browser opt-in without sign-in
  - public announcement history fallback for unsigned users
- Strengthened internal/public visibility behavior for announcements:
  - internal announcements are delivered to members only
  - visibility flips reconcile notification records to avoid stale recipient history
- Hardened database enforcement in `supabase_schema.sql`:
  - notification recipient policy tightened with visibility-aware checks
  - added users-table self-update protection trigger for privileged fields
- Removed legacy evidence seed inserts from schema to stop repeat demo-row regeneration on reruns.
- Added shared input sanitization utilities and wired them into major write paths:
  - public reporting
  - applications
  - newsroom/campaign updates
  - profile updates and related dashboard forms
- Standardized dashboard navigation by replacing scattered "Back to Dashboard" links with breadcrumb pathways.
- Added persistent active-state behavior for selected dashboard sidebar entries.
- Completed branding asset migration to `public/images/imatfutalogo.png` and removed old logo references.
- Updated README strategy:
  - main README is now concise and hiring-focused
  - implementation-heavy details are maintained in this history file

### 23) Turnstile Protection, Offline Resume Flow, And Console Hardening

- Added Cloudflare Turnstile protection to the public report and apply forms.
- Kept offline reporting available by queuing submissions locally and allowing them to resume later with a fresh Turnstile verification.
- Updated the service worker queue to stop before Cloudinary upload when a queued item does not yet have verification attached.
- Added a manual resume path for queued reports so the browser can attach a fresh verification token and continue processing.
- Removed raw error-object logging from the public reporting, apply, and several dashboard flows so browser console output stays generic.
- Documented the Turnstile setup details in the README, including the no-spaces env-var formatting note and the production-domain hostname requirement.

### 24) Localhost Testing Bypass And Friendlier Bot-Check UX

- Updated Turnstile behavior so non-production environments bypass verification by default, allowing localhost form testing without Cloudflare hostname constraints.
- Added an explicit opt-out switch (`NEXT_PUBLIC_TURNSTILE_DEV_BYPASS=false`) for teams that want to force full Turnstile behavior during local testing.
- Kept production verification strict by hard-disabling bypass behavior when `NODE_ENV=production`.
- Added clearer “Quick safety check” sections on report/apply forms so users understand the anti-spam check without getting blocked by confusing wording.

### 25) Application Submit Repair And Mobile Evidence UX Fixes

- Fixed the application submit API so it now writes the schema-required `department` and `cv_url` fields, restoring successful save behavior after Turnstile verification.
- Switched the public evidence gallery to a stacked layout on the full page instead of the horizontal swipe presentation used in compact previews.
- Raised the evidence category filter menu above the gallery cards and allowed it to scroll so all categories remain visible.
- Improved the mobile dashboard drawer scroll behavior so users can reach Sign Out after opening the menu on small screens.

### 26) Submit Resilience And Form UX Refinement

- Made the application API fall back to the public Supabase anon key when the service-role key is missing, matching the existing insert policy and reducing production submit failures.
- Allowed public defect reports to submit even when Cloudinary photo upload is unavailable by degrading gracefully to a text-only report.
- Moved the application Turnstile check to the bottom of the form so the bot check appears just before submission.
- Reduced the oversized submit/reset controls on the public report and application forms for a tighter mobile and desktop layout.

## Operational Notes

- Current image strategy uses WebP for optimized public assets.
- PWA metadata and manifest have been intentionally removed; the site now runs as a standard web app (non-PWA).
- Mobile browsers are treated as a limited PDF-preview environment; the safe path is download/open instead of inline preview.
- Build status after latest optimization changes: success.

## Decisions Log (Important)

- Prioritized safe migration and guarded release practices to avoid accidental repository/remote mistakes.
- Preferred SSR-safe Supabase integration and strict middleware authorization over permissive routing.
- Chose pre-generated WebP assets plus responsive image sizing for immediate performance gains.
- Kept cleanup/maintenance scripts in repo to support repeatable releases.

## Known Cleanup Candidates (Review Before Removing)

- No high-confidence dead files identified at this time after PWA decommission cleanup.

## How To Maintain This File

When new features or fixes are merged, append entries under:

1. Feature/Module updates
2. Security changes
3. Performance changes
4. Data model/schema changes
5. Build/deployment changes

Include what changed, why, and verification status.
