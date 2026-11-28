import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Calendar, Check, Edit3, Megaphone, Play, Plus, Star, X } from "lucide-react";
import { format } from "date-fns";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canApproveContent, canEditContent, isMemberAuthor } from "@/lib/access";
import { getAnnouncementHref } from "@/lib/news";
import { runPublishSideEffects } from "@/lib/announcements/notify";
import { approveAnnouncement, rejectAnnouncement } from "./actions";
import Image from "next/image";
import optimizeCloudinaryUrl from "@/lib/cloudinary";
import DeleteAnnouncementButton from "./DeleteAnnouncementButton";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
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
          <p className="mt-3 text-sm text-text2">Your posts go to an owner or admin for approval before they publish. Drafts and submissions only you wrote are listed here.</p>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="empty-state">
          No announcements found.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {announcements.map((item) => (
            <article key={item.id} className="glass-panel rounded-2xl p-6 shadow-lg shadow-black/5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {/* Visibility and status are different things: a draft is not
                        public yet, even when it will be public once published. */}
                    {item.status !== "draft" && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-soft bg-bg px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-text3">
                        {item.visibility === "public" ? "Public" : "Members Only"}
                      </div>
                    )}
                    {item.status === "draft" && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-soft bg-bg px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-text3">
                        {item.visibility === "public" ? "Public on publish" : "Members only on publish"}
                      </div>
                    )}
                    {item.status === "draft" && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-warning">
                        Draft
                      </div>
                    )}
                    {item.status === "pending_approval" && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-warning">
                        Pending approval
                      </div>
                    )}
                    {item.topic && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-accent">
                        {item.topic}
                      </div>
                    )}
                    {item.video_url && (
                      <div className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-primary">
                        <Play size={12} /> Video
                      </div>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-textDefault">{item.title}</h2>
                  {item.excerpt && (
                    <p className="mt-2 line-clamp-2 text-sm text-text2">{item.excerpt}</p>
                  )}
                  {item.status === "draft" && item.review_note && (
                    <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-textDefault">
                      <span className="font-semibold">Returned for changes: </span>
                      {item.review_note}
                    </p>
                  )}
                </div>
                <div className="w-16 h-16 rounded-xl border border-soft overflow-hidden bg-bg shrink-0">
                  {item.image_url ? (
                    <Image
                      src={item.image_url && item.image_url.includes('res.cloudinary.com') ? optimizeCloudinaryUrl(item.image_url, { width: 256 }) : item.image_url}
                      alt={item.title}
                      width={64}
                      height={64}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text3 text-[10px] font-mono">NO IMG</div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-text3 border-t border-soft pt-4 mt-4">
                <span className="inline-flex items-center gap-2"><Calendar size={14} /> {item.published_at ? `Published ${format(new Date(item.published_at), "MMM d, yyyy")}` : "Not published yet"}</span>
                <span>Updated {format(new Date(item.updated_at), "MMM d, yyyy")}</span>
              </div>

              <div className="mt-3 text-sm text-text2">
                By {item.author?.full_name ?? "IMAT Official"}
              </div>

              {item.status === "pending_approval" && isApprover && (
                <div className="mt-4 space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-4">
                  <p className="text-sm font-semibold text-textDefault">Waiting for your approval — publishing notifies members and sends the announcement email.</p>
                  <div className="flex flex-wrap gap-2">
                    <form action={approveAnnouncement}>
                      <input type="hidden" name="announcement_id" value={item.id} />
                      <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
                        <Check size={16} /> Approve & publish
                      </button>
                    </form>
                  </div>
                  <form action={rejectAnnouncement} className="space-y-2">
                    <input type="hidden" name="announcement_id" value={item.id} />
                    <label htmlFor={`reject-note-${item.id}`} className="block text-xs font-mono uppercase tracking-wider text-text3">
                      Return for changes — short note for the author (required)
                    </label>
                    <textarea
                      id={`reject-note-${item.id}`}
                      name="review_note"
                      required
                      maxLength={500}
                      rows={2}
                      placeholder="e.g. Check the graduand total — the VC briefing says 4,212."
                      className="field min-h-[56px] resize-y"
                    />
                    <button type="submit" className="inline-flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/20 transition-colors">
                      <X size={16} /> Reject — back to draft
                    </button>
                  </form>
                </div>
              )}
              {item.status === "pending_approval" && !isApprover && (
                <p className="mt-4 rounded-xl border border-soft bg-bg px-4 py-3 text-sm text-text2">
                  Waiting for an owner or admin to review this. You can still edit it — it stays in the queue.
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {pinningAvailable && (
                  <form action={togglePinnedAnnouncement}>
                    <input type="hidden" name="announcement_id" value={item.id} />
                    <input type="hidden" name="should_pin" value={String(!item.is_pinned)} />
                    <button
                      type="submit"
                      className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        item.is_pinned
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-soft text-text3 hover:border-accent/40 hover:text-accent"
                      }`}
                    >
                      <Star size={14} className="mr-1" />
                      {item.is_pinned ? "Unpin" : "Pin to top"}
                    </button>
                  </form>
                )}
                {(isApprover || item.status === "published") && (
                  <>
                    <form action={toggleAnnouncementVisibility}>
                      <input type="hidden" name="announcement_id" value={item.id} />
                      <input type="hidden" name="visibility" value="public" />
                      <button
                        type="submit"
                        className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          item.visibility === "public"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-soft text-text3 hover:border-primary/40 hover:text-primary"
                        }`}
                        disabled={item.visibility === "public" && item.status !== "draft"}
                      >
                        Set Public
                      </button>
                    </form>
                    <form action={toggleAnnouncementVisibility}>
                      <input type="hidden" name="announcement_id" value={item.id} />
                      <input type="hidden" name="visibility" value="members_only" />
                      <button
                        type="submit"
                        className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          item.visibility === "members_only"
                            ? "border-warning bg-warning/10 text-warning"
                            : "border-soft text-text3 hover:border-warning/40 hover:text-warning"
                        }`}
                        disabled={item.visibility === "members_only"}
                      >
                        Set Internal
                      </button>
                    </form>
                  </>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/dashboard/news/${item.slug ?? item.id}`} className="inline-flex items-center gap-2 rounded-lg border border-soft px-4 py-2 text-sm font-semibold text-textDefault hover:border-primary hover:text-primary transition-colors">
                  <Edit3 size={16} /> Edit
                </Link>
                {item.status === "published" && (
                  <Link href={getAnnouncementHref(item.slug ?? item.id)} className="inline-flex items-center gap-2 rounded-lg border border-soft px-4 py-2 text-sm font-semibold text-text3 hover:border-text3 hover:text-textDefault transition-colors">
                    View public page <ArrowRight size={16} />
                  </Link>
                )}
                <DeleteAnnouncementButton
                  announcementId={item.id}
                  title={item.title}
                  deleteAction={deleteAnnouncement}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
