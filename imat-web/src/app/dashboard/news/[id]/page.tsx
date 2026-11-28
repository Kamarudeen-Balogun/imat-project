import { redirect, notFound } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { canApproveContent, canDeleteContent, canEditContent } from "@/lib/access";
import AnnouncementEditor from "./AnnouncementEditor";

export const dynamic = "force-dynamic";

type Announcement = {
  id: string;
  slug: string | null;
  title: string;
  body: string;
  image_url: string | null;
  visibility: "public" | "members_only";
  published_at: string | null;
  updated_at: string;
  topic: string | null;
  excerpt: string | null;
  status: "draft" | "pending_approval" | "published" | null;
  video_url: string | null;
  author_id: string | null;
  review_note: string | null;
  author: { full_name: string | null } | null;
};

async function loadAnnouncement(supabase: Awaited<ReturnType<typeof createSupabaseClient>>, idOrSlug: string) {
  const bySlug = await supabase
    .from("announcements")
    .select("id, slug, title, body, image_url, visibility, published_at, updated_at, topic, excerpt, status, video_url, author_id, review_note, author:users!announcements_author_id_fkey(full_name)")
    .eq("slug", idOrSlug)
    .maybeSingle();

  if (bySlug.data) return bySlug.data as unknown as Announcement;

  const byId = await supabase
    .from("announcements")
    .select("id, slug, title, body, image_url, visibility, published_at, updated_at, topic, excerpt, status, video_url, author_id, review_note, author:users!announcements_author_id_fkey(full_name)")
    .eq("id", idOrSlug)
    .maybeSingle();

  return (byId.data ?? null) as Announcement | null;
}

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const announcement = await loadAnnouncement(supabase, id);

  if (!announcement) notFound();

  const isApprover = canApproveContent(profile?.role);
  const isAuthor = announcement.author_id === user.id;
  // Approvers can open any item. Other members can only open their own
  // drafts and pending submissions. Content editors can additionally open
  // published posts (they can edit those, but RLS stops them publishing a
  // draft or approving a pending item from the client).
  const canOpen =
    isApprover ||
    (isAuthor && announcement.status !== "published") ||
    (canEditContent(profile?.role) && announcement.status === "published");
  if (!canOpen) {
    redirect("/dashboard");
  }

  const canDelete = canDeleteContent(profile?.role);

  return <AnnouncementEditor announcement={announcement} currentUserId={user.id} canDelete={canDelete} isApprover={isApprover} isAuthor={isAuthor} />;
}