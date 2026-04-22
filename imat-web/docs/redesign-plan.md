# IMAT Full Redesign Master Plan

## Vision

IMAT will evolve into a futuristic civic operations platform focused on clarity, trust, and fast action for infrastructure maintenance workflows.

## Selected Skills And Repositories

### Frontend Design

- `next.js` for App Router architecture and progressive rendering.
- `tailwindcss` for scalable design tokens and responsive primitives.
- `@tailwindcss/forms` for consistent, high-quality form controls across the app.
- `framer-motion` for meaningful staged motion.
- `lucide-react` for consistent iconography.

### Security Skills

- `github/codeql` for static code analysis.
- `gitleaks/gitleaks` for secret scanning.
- `npm audit` for dependency vulnerability checks.
- Existing security headers in Next config will be kept and reviewed during redesign passes.

### AI Long-Chat Memory Skills

- Structured memory model inspired by LangGraph and Mem0 approaches.
- Multi-tier memory objects: working memory, episodic summaries, and semantic facts.
- Typed schema layer in app code to support future chat workflows and moderation-safe summarization.

## Redesign Color Direction

- Primary: electric blue (`#29abff`) for action and trust.
- Accent: amber (`#ffb64e`) for focus and calls to action.
- Support: mint green (`#33d8b6`) for progress and resolved states.
- Base: deep navy + layered translucent surfaces for futuristic readability.

## Responsive Strategy

- Mobile-first layout controls with fluid spacing and typography scales.
- Shared glass-panel and grid-atmosphere utility classes for consistency.
- No desktop-only interactions: all key actions remain visible on touch devices.
- Motion reduced automatically for users with reduced-motion preferences.
- Use a clean no-image hero layout with layered glass surfaces and clear headline hierarchy.

## Implementation Phases

1. Global design system and shell rework.
2. Homepage redesign and section-level responsive reflow.
3. Dashboard and core public pages redesign pass.
4. Security pipeline hardening and scan gating.
5. AI memory abstraction integration with future conversation features.
6. Accessibility and performance audit pass.

## Current Status

- Phase 1 started and partially completed.
- Security workflow bootstrap in progress.
- AI memory schema bootstrap in progress.
- Homepage hero remains image-free after review, using text-first composition instead.
- Dashboard and key public pages are now being brought into the same glass-based visual system.
- Evidence gallery now relies on database-managed uploads only; no static fallback images remain in `public/images`.
