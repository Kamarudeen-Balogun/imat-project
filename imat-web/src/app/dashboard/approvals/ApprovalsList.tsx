"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FileText,
  Megaphone,
  Play,
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import FilterChips from "@/components/list/FilterChips";
import ArticleBody from "@/components/news/ArticleBody";
import { parseVideoUrl } from "@/lib/video";
import optimizeCloudinaryUrl from "@/lib/cloudinary";
import type { ApprovalKind } from "@/lib/approvals/decide";

export type QueueItem = {
  kind: ApprovalKind;
  id: string;
  title: string;
  excerpt: string;
  detail: string;
  authorName: string;
  updatedAt: string;
  managerHref: string;
  // Full content, loaded with the queue so expanding a row never leaves it.
  body?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  contentLines?: string[];
  beforeImageUrl?: string | null;
  afterImageUrl?: string | null;
  defect?: { id: string; title: string } | null;
};

type TypeFilter = "all" | ApprovalKind;

const TYPE_FILTERS: Array<{ id: TypeFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "announcement", label: "News" },
  { id: "wiki", label: "Wiki" },
  { id: "evidence", label: "Evidence" },
];

const KIND_BADGE_CLASS: Record<ApprovalKind, string> = {
  announcement: "border-primary/40 bg-primary/10 text-primary",
  wiki: "border-accent/40 bg-accent/10 text-accent",
  evidence: "border-warning/40 bg-warning/10 text-warning",
};

const KIND_LABEL: Record<ApprovalKind, string> = {
  announcement: "News",
  wiki: "Wiki",
  evidence: "Evidence",
};

function cloudinaryUrl(url: string | null | undefined, width: number): string | null {
  if (!url) return null;
  return url.includes("res.cloudinary.com") ? optimizeCloudinaryUrl(url, { width }) : url;
}

function ExpandedContent({ item }: { item: QueueItem }) {
  if (item.kind === "announcement") {
    const image = cloudinaryUrl(item.imageUrl, 1200);
    const video = item.videoUrl ? parseVideoUrl(item.videoUrl) : null;
    return (
      <div className="space-y-5">
        {image ? (
          <div className="overflow-hidden rounded-xl border border-borderDark bg-bg">
            <Image
              src={image}
              alt={item.title}
              width={1200}
              height={675}
              unoptimized
              className="h-auto max-h-[52vh] w-full object-cover"
            />
          </div>
        ) : null}
        {video ? (
          <div className="overflow-hidden rounded-xl border border-borderDark bg-black">
            <div className="relative aspect-video w-full">
              <iframe
                src={video.embedUrl}
                title={`${item.title} — video`}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="flex items-center gap-2 bg-bg px-4 py-3 text-xs text-text3">
              <Play size={14} className="shrink-0 text-primary" />
              <span className="truncate">
                Watch on {video.provider === "youtube" ? "YouTube" : "Vimeo"} —{" "}
                <a
                  href={video.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  open the video
                </a>
              </span>
            </div>
          </div>
        ) : null}
        {item.excerpt ? <p className="text-sm font-semibold text-textDefault">{item.excerpt}</p> : null}
        <ArticleBody markdown={item.body ?? ""} />
      </div>
    );
  }

  if (item.kind === "wiki") {
    const lines = item.contentLines ?? [];
    return (
      <div className="space-y-3">
        {lines.length > 0 ? (
          lines.map((line, index) => (
            <p key={index} className="text-sm leading-relaxed text-textDefault">
              {line}
            </p>
          ))
        ) : (
          <p className="text-sm italic text-text3">This page does not yet have content.</p>
        )}
      </div>
    );
  }

  const before = cloudinaryUrl(item.beforeImageUrl, 1200);
  const after = cloudinaryUrl(item.afterImageUrl, 1200);
  return (
    <div className="space-y-5">
      {item.excerpt ? <p className="text-sm leading-relaxed text-textDefault">{item.excerpt}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <figure className="space-y-2">
          <div className="overflow-hidden rounded-xl border border-borderDark bg-bg">
            {before ? (
              <Image
                src={before}
                alt={`${item.title} — before`}
                width={1200}
                height={900}
                unoptimized
                className="h-auto w-full object-cover"
              />
            ) : (
              <p className="p-6 text-sm text-text3">No before photo.</p>
            )}
          </div>
          <figcaption className="text-xs font-semibold uppercase tracking-wider text-text3">
            Before
          </figcaption>
        </figure>
        <figure className="space-y-2">
          <div className="overflow-hidden rounded-xl border border-borderDark bg-bg">
            {after ? (
              <Image
                src={after}
                alt={`${item.title} — after`}
                width={1200}
                height={900}
                unoptimized
                className="h-auto w-full object-cover"
              />
            ) : (
              <p className="p-6 text-sm text-text3">No after photo yet.</p>
            )}
          </div>
          <figcaption className="text-xs font-semibold uppercase tracking-wider text-text3">
            After
          </figcaption>
        </figure>
      </div>
      {item.defect ? (
        <p className="rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault">
          Linked issue{" "}
          <Link
            href={`/issues/${item.defect.id}`}
            className="font-semibold text-accent hover:text-accent2"
          >
            {item.defect.id} — {item.defect.title}
          </Link>
        </p>
      ) : (
        <p className="text-sm text-text3">No linked defect.</p>
      )}
    </div>
  );
}

export default function ApprovalsList({
  items,
  approveApproval,
  rejectApproval,
}: {
  items: QueueItem[];
  approveApproval: (formData: FormData) => Promise<void>;
  rejectApproval: (formData: FormData) => Promise<void>;
}) {
  const [activeType, setActiveType] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) || item.authorName.toLowerCase().includes(q),
    );
  }, [items, query]);

  const counts = useMemo(() => {
    const result: Record<TypeFilter, number> = { all: searched.length, announcement: 0, wiki: 0, evidence: 0 };
    for (const item of searched) {
      result[item.kind] += 1;
    }
    return result;
  }, [searched]);

  const filtered = useMemo(
    () => (activeType === "all" ? searched : searched.filter((item) => item.kind === activeType)),
    [searched, activeType],
  );

  const keyOf = (item: QueueItem) => `${item.kind}-${item.id}`;

  function toggleExpanded(item: QueueItem) {
    const key = keyOf(item);
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedKeys(new Set(filtered.map((item) => keyOf(item))));
  }

  function collapseAll() {
    setExpandedKeys(new Set());
  }

  return (
    <div>
      {/* Type chips — counts reflect the current search. */}
      <FilterChips
        chips={TYPE_FILTERS.map((filter) => ({
          id: filter.id,
          label: filter.label,
          count: counts[filter.id],
        }))}
        activeId={activeType}
        onChange={(id) => setActiveType(id as TypeFilter)}
        ariaLabel="Filter approvals by type"
      />

      {/* Search — matches title or author name, works with the chips. */}
      <div className="relative mt-4">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text3"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title or author…"
          aria-label="Search approvals by title or author"
          className="w-full rounded-lg border border-soft bg-bg py-2.5 pl-9 pr-3 text-sm text-textDefault placeholder:text-text3 focus:border-primary focus:outline-none"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-text2">
          {filtered.length === 0
            ? "Nothing here."
            : `${filtered.length} item${filtered.length === 1 ? "" : "s"} awaiting review`}
        </p>
        {items.length > 0 && (
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={expandAll}
              className="font-semibold text-accent transition-colors hover:text-accent2"
            >
              Expand all
            </button>
            <span className="text-text3" aria-hidden>
              ·
            </span>
            <button
              type="button"
              onClick={collapseAll}
              className="font-semibold text-accent transition-colors hover:text-accent2"
            >
              Collapse all
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state mt-6">
          <CheckCircle2 size={28} className="mx-auto mb-3 text-text3" />
          <p className="font-bold text-textDefault">Nothing waiting for approval.</p>
          <p className="mt-1">New submissions from members will show up here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state mt-6">Nothing matches this filter — try another.</div>
      ) : (
        <div className="mt-6 grid gap-4">
          {filtered.map((item) => {
            const key = keyOf(item);
            const expanded = expandedKeys.has(key);
            return (
              <article
                key={key}
                className="glass-panel rounded-2xl p-5 shadow-lg shadow-black/5 md:p-6"
              >
                {/* Collapsed row: badge, title, author, date, quick decisions. */}
                <div className="flex flex-wrap items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(item)}
                    aria-expanded={expanded}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <span
                      className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${KIND_BADGE_CLASS[item.kind]}`}
                    >
                      {KIND_LABEL[item.kind]}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-bold text-textDefault">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-text3">
                        {item.authorName} ·{" "}
                        {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })} ·{" "}
                        {item.detail}
                      </span>
                    </span>
                    <ChevronDown
                      size={18}
                      className={`mt-1 shrink-0 text-text3 transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div className="flex shrink-0 gap-2">
                    <form action={approveApproval}>
                      <input type="hidden" name="kind" value={item.kind} />
                      <input type="hidden" name="item_id" value={item.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                      >
                        Approve
                      </button>
                    </form>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedKeys((prev) => new Set(prev).add(key));
                      }}
                      className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/20"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                <Link
                  href={item.managerHref}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-accent2"
                >
                  {item.kind === "announcement" ? (
                    <Megaphone size={15} />
                  ) : item.kind === "wiki" ? (
                    <BookOpen size={15} />
                  ) : (
                    <FileText size={15} />
                  )}
                  Open in manager
                </Link>

                {/* Expanded row: the full item, then the decision. */}
                {expanded && (
                  <div className="mt-5 space-y-5 border-t border-soft pt-5">
                    <ExpandedContent item={item} />
                    <div className="space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-4">
                      <p className="text-sm font-semibold text-textDefault">
                        Waiting for your approval — approving publishes this item.
                      </p>
                      <form action={approveApproval}>
                        <input type="hidden" name="kind" value={item.kind} />
                        <input type="hidden" name="item_id" value={item.id} />
                        <button
                          type="submit"
                          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                        >
                          Approve &amp; publish
                        </button>
                      </form>
                      <form action={rejectApproval} className="space-y-2">
                        <input type="hidden" name="kind" value={item.kind} />
                        <input type="hidden" name="item_id" value={item.id} />
                        <textarea
                          name="review_note"
                          required
                          maxLength={500}
                          rows={2}
                          placeholder="Short note for the author (required)"
                          className="w-full rounded-lg border border-soft bg-bg px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="w-full rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/20"
                        >
                          Reject — back to draft
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
