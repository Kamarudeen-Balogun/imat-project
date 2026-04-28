# IMAT - Infrastructure Maintenance Awareness Team

IMAT is a full-stack campus infrastructure operations platform built for FUTA Civil Engineering. The goal is simple: stop treating infrastructure complaints like noise, and handle them like trackable engineering work.

Production: https://imat-futa.vercel.app

## What This Project Solves

Most campus issue reporting systems fail at follow-through. People report problems, but there is no clean workflow from report to evidence to closure.

This app fixes that with one connected system:

- Public issue reporting and tracking
- Evidence collection with before/after proof
- Structured reporting and PDF exports
- Team operations dashboard with role-based access
- Newsroom and alerts for transparent communication
- Activity timeline for accountability

## Why It Matters

This is not just another form app. It is designed like an operations product:

- every major action is logged
- write paths are sanitized and rate-limited
- permissions are enforced with Supabase RLS and role checks
- public and internal content visibility are separated

## Core Features

- Public defect report flow with optional offline recovery
- Issues listing and defect lifecycle management
- Evidence gallery manager with ordering and visibility toggles
- Newsroom with public/member visibility and notification history
- Dashboard modules for defects, reports, wiki, activity, and profile
- Contact form integration to Google Apps Script + Google Sheets
- SEO baseline: sitemap, robots, canonical metadata, structured data

## Technical Snapshot

- Framework: Next.js 16 App Router + React 18 + TypeScript
- UI: Tailwind CSS + Framer Motion + custom design tokens
- Backend: Supabase (Auth + Postgres + RLS)
- Security: Turnstile, server rate limiting, sanitization utilities
- Docs/Analytics: Search Console verification + Vercel Analytics + Speed Insights + schema markup
- Deployment: Vercel

## Quick Start

Prerequisites:

- Node.js 18+
- npm

Run locally:

```bash
cd imat-web
npm install
npm run dev
```

Open the local URL printed in terminal (the project currently defaults to port 3001 when available).

## Repo Structure

```text
IMAT/
|-- imat-web/
|   |-- src/
|   |   |-- app/
|   |   |-- components/
|   |   |-- hooks/
|   |   `-- lib/
|   |-- public/
|   `-- README.md
`-- supabase_schema.sql
```

## Documentation Guide

- Product + setup documentation: imat-web/README.md
- Full implementation timeline: imat-web/history.md
- Database schema and policies: supabase_schema.sql

## Contact

- Email: codeflowx1@gmail.com
- Issues: https://github.com/Kamarudeen-Balogun/imat-project/issues

Built by a FUTA Civil Engineering student who wanted infrastructure advocacy to move from noise to measurable action.
