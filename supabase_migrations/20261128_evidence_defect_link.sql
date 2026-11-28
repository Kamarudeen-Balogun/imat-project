-- Link evidence items to the defect they document.
-- evidence_gallery previously had no relationship to defects, so an evidence
-- card could not say which issue it proved. defects.id is TEXT (the DEF-
-- reference itself), so the foreign key is TEXT, not UUID.
ALTER TABLE public.evidence_gallery
  ADD COLUMN IF NOT EXISTS defect_id TEXT REFERENCES public.defects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS evidence_gallery_defect_id_idx
  ON public.evidence_gallery (defect_id);
