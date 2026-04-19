"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { logActivityEvent } from "@/lib/activity/logEvent";
import { getAnnouncementHref } from "@/lib/news";
import { toast } from "react-hot-toast";
import { Loader2, Save, Trash2, ArrowLeft, FileText, Globe, Lock, AlertTriangle, X } from "lucide-react";

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

export default function AnnouncementEditor({
  announcement,
  currentUserId,
  canDelete,
}: {
  announcement: Announcement;
  currentUserId: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [title, setTitle] = useState(announcement.title);
  const [body, setBody] = useState(announcement.body);
  const [imageUrl, setImageUrl] = useState(announcement.image_url ?? "");
  const [visibility, setVisibility] = useState<"public" | "members_only">(announcement.visibility);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const notificationBody = useMemo(() => body.trim().replace(/\s+/g, " ").slice(0, 180) || title.trim(), [body, title]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("announcements")
      .update({
        title: title.trim(),
        body: body.trim(),
        image_url: imageUrl.trim() || null,
        visibility,
      })
      .eq("id", announcement.id);

    if (error) {
      toast.error(error.message || "Failed to update announcement.");
      setSaving(false);
      return;
    }

    await supabase
      .from("notifications")
      .update({
        title: title.trim(),
        body: notificationBody,
        href: getAnnouncementHref(announcement.slug ?? announcement.id),
      })
      .eq("announcement_id", announcement.id);

    await logActivityEvent(supabase, {
      eventType: "announcement_updated",
      entityType: "announcement",
      entityId: announcement.id,
      title: `Updated broadcast: ${title.trim()}`,
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
      <Link href="/dashboard/news" className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono mb-8">
        <ArrowLeft size={16} /> Back to Newsroom Manager
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-borderDark bg-bg2 px-3 py-1 text-xs font-mono uppercase tracking-wider text-text3 mb-4">
          <FileText size={14} /> Edit Broadcast
        </div>
        <h1 className="text-3xl font-bold text-textDefault mb-2">{announcement.title}</h1>
        <p className="text-text2">Update the text, image, or visibility. The public link stays stable while timestamps and notifications are refreshed.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-borderDark bg-bg2 p-6 md:p-8">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Headline</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-borderDark bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" required />
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Broadcast Body</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} className="w-full min-h-[280px] rounded-lg border border-borderDark bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" required />
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">Cover Image URL</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-borderDark bg-bg px-4 py-3 text-textDefault focus:outline-none focus:border-primary" />
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-3">Visibility</label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${visibility === "public" ? "border-primary bg-primary/10" : "border-borderDark bg-bg hover:border-text3"}`}>
              <input type="radio" className="mt-1" checked={visibility === "public"} onChange={() => setVisibility("public")} />
              <div>
                <div className="flex items-center gap-2 font-semibold text-textDefault"><Globe size={16} /> Public</div>
                <div className="text-sm text-text3">Visible on the public newsroom page.</div>
              </div>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${visibility === "members_only" ? "border-warning bg-warning/10" : "border-borderDark bg-bg hover:border-text3"}`}>
              <input type="radio" className="mt-1" checked={visibility === "members_only"} onChange={() => setVisibility("members_only")} />
              <div>
                <div className="flex items-center gap-2 font-semibold text-textDefault"><Lock size={16} /> Members only</div>
                <div className="text-sm text-text3">Only logged-in members can view this post.</div>
              </div>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-borderDark bg-bg p-4 text-sm text-text3">
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
            <Link href={`/newsroom/${announcement.slug ?? announcement.id}`} className="rounded-lg border border-borderDark px-4 py-3 text-center text-text3 hover:text-textDefault hover:border-text3 transition-colors">
              View public page
            </Link>
            <button type="submit" disabled={saving || deleting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-70">
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

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-danger/30 bg-bg2 shadow-2xl shadow-black/40">
            <div className="border-b border-borderDark bg-gradient-to-r from-danger/15 via-danger/5 to-transparent p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-danger/30 bg-danger/15 text-danger">
                  <AlertTriangle size={18} />
                </div>
                <button
                  type="button"
                  onClick={() => !deleting && setIsDeleteModalOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-borderDark text-text3 hover:text-textDefault hover:border-text3 transition-colors disabled:opacity-50"
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
                className="rounded-lg border border-borderDark px-4 py-2 text-sm font-semibold text-text3 hover:border-text3 hover:text-textDefault transition-colors disabled:opacity-50"
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