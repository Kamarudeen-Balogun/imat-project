"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, Check, Edit3, Play, Search, Star, X } from "lucide-react";
import { format } from "date-fns";
import { getAnnouncementHref } from "@/lib/news";
import optimizeCloudinaryUrl from "@/lib/cloudinary";
import DeleteAnnouncementButton from "./DeleteAnnouncementButton";
import FilterChips from "@/components/list/FilterChips";

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

type ServerAction = (formData: FormData) => void | Promise<void>;

/**
 * The manager list. Controls render only when the viewer can actually use
 * them — the server actions redirect everyone else, so showing the buttons
 * to them only looks like a hole:
 * - Set Public / Set Internal / Pin / Delete: approvers and content editors.
 * - Edit: approvers, content editors, and the author of an unpublished item
 *   (the editor gate lets authors edit their own drafts and pending items).
 * Everyone sees "View public page" on published items.
 */
export default function NewsManagerList({
  items,
  isApprover,
  canManage,
  userId,
  pinningAvailable,
  toggleAnnouncementVisibility,
  togglePinnedAnnouncement,
  deleteAnnouncement,
  approveAnnouncement,
  rejectAnnouncement,
}: {
  items: AnnouncementRow[];
  isApprover: boolean;
  canManage: boolean;
  userId: string;
  pinningAvailable: boolean;
  toggleAnnouncementVisibility: ServerAction;
  togglePinnedAnnouncement: ServerAction;
  deleteAnnouncement: ServerAction;
  approveAnnouncement: ServerAction;
  rejectAnnouncement: ServerAction;
}) {
  const [activeStatus, setActiveStatus] = useState("all");
  const [query, setQuery] = useState("");

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.title.toLowerCase().includes(q));
  }, [items, query]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: searched.length,
      draft: 0,
      pending_approval: 0,
      published: 0,
    };
    for (const item of searched) {
      if (item.status && counts[item.status] !== undefined) counts[item.status] += 1;
    }
    return counts;
  }, [searched]);

  const visibleItems = useMemo(
    () =>
      activeStatus === "all"
        ? searched
        : searched.filter((item) => item.status === activeStatus),
    [searched, activeStatus],
  );

  if (items.length === 0) {
    return <div className="empty-state">No announcements found.</div>;
  }

  return (
    <>
      <div className="mb-4">
        <FilterChips
          chips={[
            { id: "all", label: "All", count: statusCounts.all },
            { id: "draft", label: "Draft", count: statusCounts.draft },
            { id: "pending_approval", label: "Pending approval", count: statusCounts.pending_approval },
            { id: "published", label: "Published", count: statusCounts.published },
          ]}
          activeId={activeStatus}
          onChange={setActiveStatus}
          ariaLabel="Filter broadcasts by status"
        />
      </div>
      <div className="relative mb-6">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text3"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title…"
          aria-label="Search broadcasts by title"
          className="w-full rounded-lg border border-soft bg-bg p-3 pl-9 text-textDefault placeholder-text3 focus:border-primary focus:outline-none"
        />
      </div>

      {visibleItems.length === 0 ? (
        <div className="empty-state">No broadcasts match these filters.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibleItems.map((item) => {
            const isAuthor = item.author_id === userId;
            const canEditItem =
              isApprover || canManage || (isAuthor && item.status !== "published");
            return (
            <article key={item.id} className="glass-panel rounded-xl p-6 shadow-lg shadow-black/5">
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
                      <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition-colors">
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

              {canManage && (
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
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {canEditItem && (
                  <Link href={`/dashboard/news/${item.slug ?? item.id}`} className="inline-flex items-center gap-2 rounded-lg border border-soft px-4 py-2 text-sm font-semibold text-textDefault hover:border-primary hover:text-primary transition-colors">
                    <Edit3 size={16} /> Edit
                  </Link>
                )}
                {item.status === "published" && (
                  <Link href={getAnnouncementHref(item.slug ?? item.id)} className="inline-flex items-center gap-2 rounded-lg border border-soft px-4 py-2 text-sm font-semibold text-text3 hover:border-text3 hover:text-textDefault transition-colors">
                    View public page <ArrowRight size={16} />
                  </Link>
                )}
                {canManage && (
                  <DeleteAnnouncementButton
                    announcementId={item.id}
                    title={item.title}
                    deleteAction={deleteAnnouncement}
                  />
                )}
              </div>
            </article>
            );
          })}
        </div>
      )}
    </>
  );
}
