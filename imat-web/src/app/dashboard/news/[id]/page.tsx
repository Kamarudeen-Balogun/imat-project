import { redirect, notFound } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { canEditContent, canDeleteContent } from "@/lib/access";
import AnnouncementEditor from "./AnnouncementEditor";

export const dynamic = "force-dynamic";

type Announcement = {
  id: string;
  slug: string | null;
  title: string;
  body: string;
  image_url: string | null;
  visibility: "public" | "members_only";
  published_at: string;
  updated_at: string;
  author: { full_name: string | null } | null;
};

async function loadAnnouncement(supabase: Awaited<ReturnType<typeof createSupabaseClient>>, idOrSlug: string) {
  const bySlug = await supabase
    .from("announcements")
    .select("id, slug, title, body, image_url, visibility, published_at, updated_at, author:users!announcements_author_id_fkey(full_name)")
    .eq("slug", idOrSlug)
    .maybeSingle();

  if (bySlug.data) return bySlug.data as unknown as Announcement;

  const byId = await supabase
    .from("announcements")
    .select("id, slug, title, body, image_url, visibility, published_at, updated_at, author:users!announcements_author_id_fkey(full_name)")
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

  if (!canEditContent(profile?.role)) {
    redirect("/dashboard");
  }

  const announcement = await loadAnnouncement(supabase, id);

  if (!announcement) notFound();

  const canDelete = canDeleteContent(profile?.role);

  return <AnnouncementEditor announcement={announcement} currentUserId={user.id} canDelete={canDelete} />;
}