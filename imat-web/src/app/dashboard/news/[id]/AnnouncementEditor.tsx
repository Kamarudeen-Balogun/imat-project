"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { logActivityEvent } from "@/lib/activity/logEvent";
import { sanitizeMarkdown, sanitizePlainText, sanitizeUrl } from "@/lib/inputSanitizer";
import { markdownToPlainText } from "@/lib/markdown";
import { parseVideoUrl } from "@/lib/video";
import { ANNOUNCEMENT_TOPICS } from "@/lib/announcements";
import { toast } from "react-hot-toast";
import { Check, Loader2, Save, Send, Trash2, FileText, Globe, Lock, AlertTriangle, Video, X } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { approveAnnouncement, rejectAnnouncement, submitAnnouncementForApproval } from "../actions";

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

export default function AnnouncementEditor({
  announcement,
  currentUserId,
  canDelete,
  isApprover,
  isAuthor,
}: {
  announcement: Announcement;
  currentUserId: string;
  canDelete: boolean;
  isApprover: boolean;
  isAuthor: boolean;
}) {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [title, setTitle] = useState(announcement.title);
  const [topic, setTopic] = useState(announcement.topic ?? "General");
  const [excerpt, setExcerpt] = useState(announcement.excerpt ?? "");
  const [body, setBody] = useState(announcement.body);
  const [imageUrl, setImageUrl] = useState(announcement.image_url ?? "");
  const [videoUrl, setVideoUrl] = useState(announcement.video_url ?? "");
  const [visibility, setVisibility] = useState<"public" | "members_only">(announcement.visibility);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const video = videoUrl.trim() ? parseVideoUrl(videoUrl) : null;
  const videoInvalid = videoUrl.trim().length > 0 && !video;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const safeTitle = sanitizePlainText(title, 120);
    const safeTopic = ANNOUNCEMENT_TOPICS.includes(topic as (typeof ANNOUNCEMENT_TOPICS)[number]) ? topic : "General";
    const safeExcerpt = sanitizePlainText(excerpt, 200);
    const safeBody = sanitizeMarkdown(body, 20000);
    const safeImageUrl = sanitizeUrl(imageUrl.trim());
    const safeVideoUrl = video ? video.watchUrl : "";
    const safeNotificationBody = markdownToPlainText(safeBody).slice(0, 180) || safeTitle;

    if (!safeTitle || !safeBody) {
      toast.error("Headline and body are required.");
      setSaving(false);
      return;
    }
    if (videoInvalid) {
      toast.error("That video link is not a YouTube or Vimeo URL.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("announcements")
      .update({
        title: safeTitle,
        body: safeBody,
        image_url: safeImageUrl || null,
        visibility,
        topic: safeTopic,
        excerpt: safeExcerpt || null,
        video_url: safeVideoUrl || null,
      })
      .eq("id", announcement.id);

    if (error) {
      toast.error(error.message || "Failed to update announcement.");
      setSaving(false);
      return;
    }

    // Keep existing in-app rows in sync and fan out to newly eligible members.
    // Both run server-side: the old user-client notification writes silently
    // failed under RLS (see lib/announcements/notify.ts).
    if (announcement.status === "published") {
      try {
        await fetch("/api/approvals/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "announcement",
            id: announcement.id,
            mode: "sync",
            title: safeTitle,
            body: safeNotificationBody,
          }),
        });
      } catch (error) {
        console.warn("Notification sync failed.", error);
      }
    }

    if (announcement.visibility !== visibility && visibility === "public" && announcement.status === "published") {
      try {
        const fanOutResponse = await fetch("/api/approvals/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "announcement", id: announcement.id, mode: "fanout" }),
        });
        if (!fanOutResponse.ok) console.warn("Notification fan-out failed.", await fanOutResponse.text().catch(() => ""));
      } catch (error) {
        console.warn("Notification fan-out failed.", error);
      }

      try {
        const pushResponse = await fetch("/api/announcements/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ announcementId: announcement.id }),
        });

        if (!pushResponse.ok) {
          const payload = await pushResponse.text().catch(() => "");
          console.warn("Push delivery failed.", payload);
        }
      } catch (pushError) {
        console.warn("Push delivery failed.", pushError);
      }

      try {
        const emailResponse = await fetch("/api/announcements/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ announcementId: announcement.id }),
        });

        if (!emailResponse.ok) {
          const payload = await emailResponse.text().catch(() => "");
          console.warn("Announcement email delivery failed.", payload);
        }
      } catch (emailError) {
        console.warn("Announcement email delivery failed.", emailError);
      }
    }

    await logActivityEvent(supabase, {
      eventType: "announcement_updated",
      entityType: "announcement",
      entityId: announcement.id,
      title: `Updated broadcast: ${safeTitle}`,
      actorId: currentUserId,
      details: {
        slug: announcement.slug,
        visibility,
      },
      isRelevant: true,
    });

    toast.success("Broadcast updated.");
    router.replace(`/dashboard/news/${announcement.slug ?? announcement.id}`);
    router.refresh();
  };

  // Publishing a saved draft: same fan-out + push + email as a fresh publish.
  // Approvers only — enforced again by RLS and the notify route.
  const handlePublishDraft = async () => {
    if (announcement.status !== "draft" || !isApprover) return;
    if (videoInvalid) {
      toast.error("That video link is not a YouTube or Vimeo URL.");
      return;
    }

    setPublishing(true);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("announcements")
      .update({ status: "published", published_at: now, updated_at: now })
      .eq("id", announcement.id);

    if (error) {
      toast.error(error.message || "Failed to publish draft.");
      setPublishing(false);
      return;
    }

    // Fan-out runs server-side so the in-app rows cannot silently fail under RLS.
    try {
      const notifyResponse = await fetch("/api/approvals/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "announcement", id: announcement.id, mode: "fanout" }),
      });
      if (!notifyResponse.ok) console.warn("Notification fan-out failed.", await notifyResponse.text().catch(() => ""));
    } catch (error) {
      console.warn("Notification fan-out failed.", error);
    }

    try {
      const pushResponse = await fetch("/api/announcements/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId: announcement.id }),
      });
      if (!pushResponse.ok) console.warn("Push delivery failed.", await pushResponse.text().catch(() => ""));
    } catch (error) {
      console.warn("Push delivery failed.", error);
    }

    try {
      const emailResponse = await fetch("/api/announcements/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId: announcement.id }),
      });
      if (!emailResponse.ok) console.warn("Announcement email delivery failed.", await emailResponse.text().catch(() => ""));
    } catch (error) {
      console.warn("Announcement email delivery failed.", error);
    }

    await logActivityEvent(supabase, {
      eventType: "announcement_published",
      entityType: "announcement",
      entityId: announcement.id,
      title: `Published broadcast: ${title}`,
      actorId: currentUserId,
      details: { slug: announcement.slug, visibility },
      isRelevant: true,
    });

    toast.success("Broadcast published!");
    router.replace(`/dashboard/news/${announcement.slug ?? announcement.id}`);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!canDelete) {
      toast.error("You do not have permission to delete broadcasts.");
      return;
    }

    setDeleting(true);

    const { error } = await supabase.from("announcements").delete().eq("id", announcement.id);

    if (error) {
      toast.error(error.message || "Failed to delete announcement.");
      setDeleting(false);
      return;
    }

    await logActivityEvent(supabase, {
      eventType: "announcement_deleted",
      entityType: "announcement",
      entityId: announcement.id,
      title: `Deleted broadcast: ${announcement.title}`,
      actorId: currentUserId,
      details: {
        slug: announcement.slug,
      },
      isRelevant: true,
    });

    toast.success("Broadcast deleted.");
    router.push("/dashboard/news");
    router.refresh();
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-16">
      <Breadcrumbs className="mb-8" />

      <div className="mb-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-soft bg-bg2 px-3 py-1 text-xs font-mono uppercase tracking-wider text-text3">
            <FileText size={14} /> Edit Broadcast
          </div>
          {announcement.status === "draft" && (
            <div className="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-warning">
              Draft — not published
            </div>
          )}
          {announcement.status === "pending_approval" && (
            <div className="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-warning">
              Pending approval
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold text-textDefault mb-2">{announcement.title}</h1>
        <p className="text-text2">Update the text, image, or visibility. The public link stays stable while timestamps and notifications are refreshed.</p>
        {announcement.status === "draft" && announcement.review_note && (
          <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-textDefault">
            <span className="font-semibold">Returned for changes: </span>
            {announcement.review_note}
          </p>
        )}
        {announcement.status === "pending_approval" && !isApprover && (
          <p className="mt-4 rounded-xl border border-soft bg-bg px-4 py-3 text-sm text-text2">
            Waiting for an owner or admin to review this. Your edits here stay in the queue — they will not publish on save.
          </p>
        )}
      </div>

      {announcement.status === "pending_approval" && isApprover && (
        <div className="mb-6 space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-5">
          <p className="text-sm font-semibold text-textDefault">Waiting for your approval — publishing notifies members and sends the announcement email.</p>
          <div className="flex flex-wrap gap-2">
            <form action={approveAnnouncement}>
              <input type="hidden" name="announcement_id" value={announcement.id} />
              <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition-colors">
                <Check size={16} /> Approve & publish
              </button>
            </form>
          </div>
          <form action={rejectAnnouncement} className="space-y-2">
            <input type="hidden" name="announcement_id" value={announcement.id} />
            <label htmlFor="reject-note" className="block text-xs font-mono uppercase tracking-wider text-text3">
              Return for changes — short note for the author (required)
            </label>
            <textarea
              id="reject-note"
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

      <form onSubmit={handleSave} className="space-y-6 rounded-xl border border-soft bg-bg2 p-6 md:p-8">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Headline</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-soft bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Topic</label>
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full rounded-lg border border-soft bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary">
              {ANNOUNCEMENT_TOPICS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Standfirst (short intro)</label>
            <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="One or two sentences that sum up the story." maxLength={200} className="w-full rounded-lg border border-soft bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Broadcast Body</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} className="w-full min-h-[280px] rounded-lg border border-soft bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" required />
          <p className="mt-1.5 text-xs text-text3">Formatting: ## heading, **bold**, *italic*, - list, 1. numbered list, &gt; quote, [text](https://…) link, ![caption](image url) image.</p>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Cover Image URL</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-soft bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" />
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-text3"><Video size={14} /> Video — YouTube or Vimeo link</label>
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="e.g. https://www.youtube.com/watch?v=..." className="w-full rounded-lg border border-soft bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" />
          {videoInvalid && <p className="mt-1.5 text-sm text-danger">That link is not a YouTube or Vimeo video URL.</p>}
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-3">Visibility</label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${visibility === "public" ? "border-primary bg-primary/10" : "border-soft bg-bg hover:border-text3"}`}>
              <input type="radio" className="mt-1" checked={visibility === "public"} onChange={() => setVisibility("public")} />
              <div>
                <div className="flex items-center gap-2 font-semibold text-textDefault"><Globe size={16} /> Public</div>
                <div className="text-sm text-text3">Visible on the public newsroom page.</div>
              </div>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${visibility === "members_only" ? "border-warning bg-warning/10" : "border-soft bg-bg hover:border-text3"}`}>
              <input type="radio" className="mt-1" checked={visibility === "members_only"} onChange={() => setVisibility("members_only")} />
              <div>
                <div className="flex items-center gap-2 font-semibold text-textDefault"><Lock size={16} /> Members only</div>
                <div className="text-sm text-text3">Only logged-in members can view this post.</div>
              </div>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-soft bg-bg p-4 text-sm text-text3">
          <div>Published by {announcement.author?.full_name ?? "IMAT Official"}</div>
          <div>Updated on {new Date(announcement.updated_at).toLocaleDateString()}</div>
          <div>Slug: {announcement.slug ?? announcement.id}</div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center pt-2">
          <div>
            {canDelete && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={deleting || saving}
                className="inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-danger font-semibold hover:bg-danger/20 transition-colors disabled:opacity-70"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete Broadcast
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:ml-auto">
            {announcement.status === "published" && (
              <Link href={`/newsroom/${announcement.slug ?? announcement.id}`} className="rounded-lg border border-soft px-4 py-3 text-center text-text3 hover:text-textDefault hover:border-text3 transition-colors">
                View public page
              </Link>
            )}
            {announcement.status === "draft" && isApprover && (
              <button
                type="button"
                onClick={() => void handlePublishDraft()}
                disabled={saving || publishing || deleting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 font-semibold text-white hover:brightness-110 transition-colors disabled:opacity-70"
              >
                {publishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Publish Draft
              </button>
            )}
            {announcement.status === "draft" && !isApprover && isAuthor && (
              <form action={submitAnnouncementForApproval}>
                <input type="hidden" name="announcement_id" value={announcement.id} />
                <button
                  type="submit"
                  disabled={saving || publishing || deleting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 font-semibold text-white hover:brightness-110 transition-colors disabled:opacity-70"
                >
                  <Send size={16} /> Submit for approval
                </button>
              </form>
            )}
            <button type="submit" disabled={saving || publishing || deleting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-white hover:brightness-110 transition-colors disabled:opacity-70">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
            </button>
          </div>
        </div>
      </form>

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close delete confirmation"
            onClick={() => !deleting && setIsDeleteModalOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-danger/30 bg-bg2 shadow-2xl shadow-black/40">
            <div className="border-b border-soft bg-danger/5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-danger/30 bg-danger/15 text-danger">
                  <AlertTriangle size={18} />
                </div>
                <button
                  type="button"
                  onClick={() => !deleting && setIsDeleteModalOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-soft text-text3 hover:text-textDefault hover:border-text3 transition-colors disabled:opacity-50"
                  aria-label="Close"
                  disabled={deleting}
                >
                  <X size={14} />
                </button>
              </div>
              <h3 className="mt-4 text-lg font-bold text-textDefault">Delete broadcast?</h3>
              <p className="mt-2 text-sm text-text2">
                This will permanently remove <span className="font-semibold text-textDefault">{announcement.title}</span>.
                This action cannot be undone.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2 p-5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleting}
                className="rounded-lg border border-soft px-4 py-2 text-sm font-semibold text-text3 hover:border-text3 hover:text-textDefault transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleDelete();
                  setIsDeleteModalOpen(false);
                }}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg border border-danger/40 bg-danger px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition disabled:opacity-70"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Yes, delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}