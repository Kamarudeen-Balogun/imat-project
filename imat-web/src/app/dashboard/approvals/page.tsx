import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/server";
import { canApproveContent } from "@/lib/access";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { approveApproval, rejectApproval } from "./actions";
import ApprovalsList, { type QueueItem } from "./ApprovalsList";

export const dynamic = "force-dynamic";

// Mirrors the wiki detail page: TipTap JSON has no HTML, so the full text
// is recovered by walking the document tree and collecting text nodes.
function extractWikiText(node: unknown): string[] {
  if (!node || typeof node !== "object") return [];
  const current = node as { type?: string; content?: unknown[]; text?: string };
  const lines: string[] = [];
  if (typeof current.text === "string" && current.text.trim()) {
    lines.push(current.text.trim());
  }
  if (Array.isArray(current.content)) {
    current.content.forEach((child) => {
      lines.push(...extractWikiText(child));
    });
  }
  return lines;
}

export default async function ApprovalsPage() {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  // Owner/admin only — everyone else goes back to the dashboard.
  if (!canApproveContent(profile?.role)) redirect("/dashboard");

  const [announcements, wikiPages, evidenceItems] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, excerpt, topic, image_url, video_url, updated_at, author_id")
      .eq("status", "pending_approval")
      .order("updated_at", { ascending: false }),
    supabase
      .from("wiki_pages")
      .select("id, title, slug, category, content_tiptap_json, updated_at, author_id")
      .eq("status", "pending_approval")
      .order("updated_at", { ascending: false }),
    supabase
      .from("evidence_gallery")
      .select("id, title, description, category, before_image_url, after_image_url, defect_id, updated_at, created_by")
      .eq("status", "pending_approval")
      .order("updated_at", { ascending: false }),
  ]);

  const announcementRows = (announcements.data ?? []) as Array<{
    id: string;
    title: string;
    body: string;
    excerpt: string | null;
    topic: string | null;
    image_url: string | null;
    video_url: string | null;
    updated_at: string;
    author_id: string | null;
  }>;
  const wikiRows = (wikiPages.data ?? []) as Array<{
    id: string;
    title: string;
    slug: string;
    category: string;
    content_tiptap_json: unknown;
    updated_at: string;
    author_id: string | null;
  }>;
  const evidenceRows = (evidenceItems.data ?? []) as Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    before_image_url: string;
    after_image_url: string | null;
    defect_id: string | null;
    updated_at: string;
    created_by: string | null;
  }>;

  const authorIds = Array.from(
    new Set(
      [
        ...announcementRows.map((row) => row.author_id),
        ...wikiRows.map((row) => row.author_id),
        ...evidenceRows.map((row) => row.created_by),
      ].filter((id): id is string => Boolean(id)),
    ),
  );
  const authorNames = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: authors } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", authorIds);
    for (const author of (authors ?? []) as Array<{ id: string; full_name: string | null }>) {
      authorNames.set(author.id, author.full_name ?? "IMAT");
    }
  }

  const defectIds = Array.from(
    new Set(evidenceRows.map((row) => row.defect_id).filter((id): id is string => Boolean(id))),
  );
  const defectTitles = new Map<string, string>();
  if (defectIds.length > 0) {
    const { data: defects } = await supabase
      .from("defects")
      .select("id, title")
      .in("id", defectIds);
    for (const defect of (defects ?? []) as Array<{ id: string; title: string }>) {
      defectTitles.set(defect.id, defect.title);
    }
  }

  const items: QueueItem[] = [
    ...announcementRows.map((row) => ({
      kind: "announcement" as const,
      id: row.id,
      title: row.title,
      excerpt: row.excerpt ?? "",
      detail: row.topic ?? "Broadcast",
      authorName: row.author_id ? authorNames.get(row.author_id) ?? "IMAT" : "IMAT",
      updatedAt: row.updated_at,
      managerHref: "/dashboard/news",
      body: row.body,
      imageUrl: row.image_url,
      videoUrl: row.video_url,
    })),
    ...wikiRows.map((row) => ({
      kind: "wiki" as const,
      id: row.id,
      title: row.title,
      excerpt: "",
      detail: row.category,
      authorName: row.author_id ? authorNames.get(row.author_id) ?? "IMAT" : "IMAT",
      updatedAt: row.updated_at,
      managerHref: `/dashboard/wiki/${row.slug}`,
      contentLines: extractWikiText(row.content_tiptap_json),
    })),
    ...evidenceRows.map((row) => ({
      kind: "evidence" as const,
      id: row.id,
      title: row.title,
      excerpt: row.description,
      detail: row.category,
      authorName: row.created_by ? authorNames.get(row.created_by) ?? "IMAT" : "IMAT",
      updatedAt: row.updated_at,
      managerHref: "/dashboard/evidence",
      beforeImageUrl: row.before_image_url,
      afterImageUrl: row.after_image_url,
      defect: row.defect_id
        ? { id: row.defect_id, title: defectTitles.get(row.defect_id) ?? row.defect_id }
        : null,
    })),
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-500 px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumbs className="mb-8" />

      <div className="mb-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-warning">
          <CheckCircle2 size={14} /> Approvals
        </div>
        <h1 className="mb-2 text-2xl font-bold text-textDefault md:text-3xl">Review queue</h1>
        <p className="max-w-2xl text-text2">
          Everything waiting for approval across news, wiki and evidence, in one place.
          Open a row to read it in full before you decide — approving publishes it,
          rejecting sends it back to its author as a draft with your note.
        </p>
      </div>

      <ApprovalsList items={items} approveApproval={approveApproval} rejectApproval={rejectApproval} />
    </div>
  );
}
