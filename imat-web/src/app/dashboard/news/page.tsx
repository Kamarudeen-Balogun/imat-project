import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Megaphone, Plus } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canApproveContent, canEditContent, isMemberAuthor } from "@/lib/access";
import { runPublishSideEffects } from "@/lib/announcements/notify";
import { approveAnnouncement, rejectAnnouncement } from "./actions";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import NewsManagerList from "./NewsManagerList";
import {
  ANNOUNCEMENT_MANAGER_SELECT,
  ANNOUNCEMENT_MANAGER_SELECT_WITH_PIN,
  isMissingPinnedColumn,
} from "@/lib/announcements";

export const dynamic = "force-dynamic";

type AnnouncementRow = {
  id: string;
  slug: string | null;
  title: string;
  visibility: "public" | "members_only";
  published_at: string | null;
  updated_at: string;
  image_url: string | null;
  is_pinned?: boolean | null;
  topic: string | null;
  excerpt: string | null;
  status: "draft" | "pending_approval" | "published" | null;
  video_url: string | null;
  author_id: string | null;
  submitted_by: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  author: { full_name: string | null } | null;
};

async function toggleAnnouncementVisibility(formData: FormData) {
  "use server";

  const announcementId = String(formData.get("announcement_id") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "").trim();

  if (!announcementId || !["public", "members_only"].includes(visibility)) {
    return;
  }

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!canEditContent(profile?.role)) {
    redirect("/dashboard");
  }

  const { data: existingAnnouncement } = await supabase
    .from("announcements")
    .select("id, slug, title, body, visibility, status")
    .eq("id", announcementId)
    .single();

  if (!existingAnnouncement) {
    redirect("/dashboard/news");
  }

  const previousVisibility = existingAnnouncement.visibility;
  const isDraft = existingAnnouncement.status === "draft";
  const isPending = existingAnnouncement.status === "pending_approval";

  // A pending item is in the approval queue: only an approver may move it.
  // Anyone else flipping its visibility must not publish it.
  if (isPending && !canApproveContent(profile?.role)) {
    redirect("/dashboard/news");
  }

  // Flipping a draft (or a pending item, by an approver) to public IS
  // publishing it: it must leave draft/pending status and get a real publish
  // date, or the newsroom would still hide it.
  const updates: { visibility: string; updated_at: string; status?: string; published_at?: string; reviewed_by?: string } = {
    visibility,
    updated_at: new Date().toISOString(),
  };
  if (visibility === "public" && (isDraft || isPending)) {
    updates.status = "published";
    updates.published_at = new Date().toISOString();
    updates.reviewed_by = user.id;
  }

  await supabase
    .from("announcements")
    .update(updates)
    .eq("id", announcementId);

  if (visibility === "public" && (previousVisibility === "members_only" || isDraft || isPending)) {
    // Publish side-effects run server-side (admin client). The old user-client
    // notification insert silently failed under RLS — see lib/announcements/notify.ts.
    await runPublishSideEffects(announcementId, user.id);
  }

  if (previousVisibility === "public" && visibility === "members_only") {
    const { data: applicantUsers } = await supabase
      .from("users")
      .select("id")
      .eq("status", "active")
      .eq("role", "applicant");

    const applicantIds = (applicantUsers ?? []).map((row) => row.id);
    if (applicantIds.length > 0) {
      // No delete policy exists for the user client, so this runs as admin.
      const admin = createSupabaseAdminClient();
      await admin
        .from("notifications")
        .delete()
        .eq("announcement_id", announcementId)
        .eq("type", "news_update")
        .in("recipient_id", applicantIds);
    }
  }

  // Refresh the manager list immediately — without this the row keeps
  // showing its old state until a manual reload.
  revalidatePath("/dashboard/news");
  redirect("/dashboard/news");
}

async function deleteAnnouncement(formData: FormData) {
  "use server";

  const announcementId = String(formData.get("announcement_id") ?? "").trim();
  if (!announcementId) return;

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!canEditContent(profile?.role)) {
    redirect("/dashboard");
  }

  await supabase.from("announcements").delete().eq("id", announcementId);
  revalidatePath("/dashboard/news");
  redirect("/dashboard/news");
}

async function togglePinnedAnnouncement(formData: FormData) {
  "use server";

  const announcementId = String(formData.get("announcement_id") ?? "").trim();
  const shouldPin = String(formData.get("should_pin") ?? "") === "true";

  if (!announcementId) return;

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!canEditContent(profile?.role)) {
    redirect("/dashboard");
  }

  if (shouldPin) {
    await supabase.from("announcements").update({ is_pinned: false }).eq("is_pinned", true).neq("id", announcementId);
  }

  const { error } = await supabase
    .from("announcements")
    .update({ is_pinned: shouldPin, updated_at: new Date().toISOString() })
    .eq("id", announcementId);

  if (error) {
    console.warn("Failed to update pinned state.", error);
  }

  revalidatePath("/dashboard/news");
  redirect("/dashboard/news");
}

export default async function DashboardNewsPage() {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  // The manager is the approval queue: every member (except applicants) can
  // reach it to see their own drafts and submissions. Approvers see everything.
  if (!isMemberAuthor(profile?.role)) {
    redirect("/dashboard");
  }

  const isApprover = canApproveContent(profile?.role);
  const canManage = isApprover || canEditContent(profile?.role);

  let pinningAvailable = true;
  const pinnedResult = await supabase
    .from("announcements")
    .select(ANNOUNCEMENT_MANAGER_SELECT_WITH_PIN)
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false });
  let data: unknown[] | null = pinnedResult.data;
  let error = pinnedResult.error;

  if (isMissingPinnedColumn(error)) {
    pinningAvailable = false;
    const fallback = await supabase
      .from("announcements")
      .select(ANNOUNCEMENT_MANAGER_SELECT)
      .order("published_at", { ascending: false });

    data = fallback.data as unknown[] | null;
    error = fallback.error;
  }

  if (error) {
    console.warn("Failed to load newsroom manager announcements.", error);
  }

  const allAnnouncements = (data ?? []) as unknown as AnnouncementRow[];
  // Approvers see the whole queue; other members see their own items plus
  // anything already published.
  const announcements = isApprover
    ? allAnnouncements
    : allAnnouncements.filter((item) => item.author_id === user.id || item.status === "published");
  const pendingCount = allAnnouncements.filter((item) => item.status === "pending_approval").length;

   return (
     <div className="mx-auto max-w-6xl animate-in fade-in duration-500 px-4 pb-16 pt-6 sm:px-6">
       <Breadcrumbs className="mb-8" />
       <div className="flex flex-wrap items-center justify-end gap-4 mb-8">
        <Link href="/dashboard/campaigns/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
          <Plus size={16} /> New Broadcast
        </Link>
      </div>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-primary mb-4">
          <Megaphone size={14} /> Newsroom Manager
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2">Manage published broadcasts</h1>
        <p className="text-text2 max-w-2xl">Edit, update, or delete announcements. Updates preserve the original public link while refreshing timestamps and notifications.</p>
        {isApprover && pendingCount > 0 && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
            {pendingCount} awaiting review
          </p>
        )}
        {!isApprover && (
          <p className="mt-3 text-sm text-text2">Your posts go to an owner or admin for approval before they publish. You see your own drafts and submissions, plus every published broadcast.</p>
        )}
      </div>

      <NewsManagerList
        items={announcements}
        isApprover={isApprover}
        canManage={canManage}
        userId={user.id}
        pinningAvailable={pinningAvailable}
        toggleAnnouncementVisibility={toggleAnnouncementVisibility}
        togglePinnedAnnouncement={togglePinnedAnnouncement}
        deleteAnnouncement={deleteAnnouncement}
        approveAnnouncement={approveAnnouncement}
        rejectAnnouncement={rejectAnnouncement}
      />
    </div>
  );
}
