-- Add reviewed_at to applications so the CSV export can show when an
-- application was decided (accepted / rejected / direct-invited).
-- Nullable, no backfill: rows decided before this migration keep NULL.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
