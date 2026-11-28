-- Broadcast composer (2026-11-28): topic + excerpt + draft status for announcements.
-- Drafts (status = 'draft') are never shown in the newsroom and never fanned
-- out; only published rows are public. Existing rows default to 'published'
-- so nothing already live changes.
ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS topic TEXT;

ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS excerpt TEXT;

ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
CHECK (status IN ('draft', 'published'));

-- Broadcast video (2026-11-28): pasted YouTube/Vimeo URL, rendered as an
-- embedded player on the post and as a thumbnail + play link in emails.
ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS video_url TEXT;

CREATE INDEX IF NOT EXISTS announcements_status_published_at_idx
ON public.announcements (status, published_at DESC);
