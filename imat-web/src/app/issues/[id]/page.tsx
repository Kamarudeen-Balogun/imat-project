import { createSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo";
import PublicDefectDetail, {
  type LinkedEvidence,
  type PublicDefect,
} from "./PublicDefectDetail";

export const dynamic = "force-dynamic";

const DEFECT_COLUMNS =
  "id, title, description, category, defect_type, affected_area_sqm, status, created_at, photos, campus_zones(name)";

async function loadDefect(defectId: string) {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("defects")
    .select(DEFECT_COLUMNS)
    .eq("id", defectId)
    .single();

  if (error || !data) return null;

  const { data: evidence } = await supabase
    .from("evidence_gallery")
    .select("id, title, description, before_image_url, after_image_url")
    .eq("defect_id", defectId)
    .eq("status", "published")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return {
    defect: data as unknown as PublicDefect,
    linkedEvidence: (evidence ?? []) as LinkedEvidence[],
  };
}

function toDescription(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 160 ? `${flat.substring(0, 157)}...` : flat;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadDefect(id);

  if (!loaded) return { title: "Issue not found · IMAT FUTA" };

  const { defect } = loaded;

  return buildPageMetadata({
    title: `${defect.title} · IMAT FUTA Issues`,
    description: toDescription(defect.description),
    path: `/issues/${defect.id}`,
    image:
      defect.photos && defect.photos.length > 0
        ? { url: defect.photos[0], alt: `Evidence photo for ${defect.title}` }
        : undefined,
  });
}

export default async function PublicDefectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadDefect(id);

  // Missing issues 404 (renders src/app/not-found.tsx) instead of showing
  // a generic page — a real issue page always carries its own title.
  if (!loaded) notFound();

  return <PublicDefectDetail defect={loaded.defect} linkedEvidence={loaded.linkedEvidence} />;
}
