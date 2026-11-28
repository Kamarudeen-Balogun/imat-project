"use client";

import Link from "next/link";
import { Link2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import DefectStatusBadge from "@/components/defects/DefectStatusBadge";
import { EvidenceImageSlot } from "@/components/evidence/EvidenceGalleryGrid";
import type { BoardChip } from "@/lib/defects";

/** Homepage board is evidence only — one item per published repair record. */
export type BoardItem = {
  key: string;
  title: string;
  description: string;
  chip: Exclude<BoardChip, "All"> | null;
  date: string;
  beforeImage: string | null;
  afterImage: string | null;
  href: string;
  /** Raw defect status, or "resolved" / "assessed" for evidence items. */
  status: string;
  ticketLabel: string;
  linkedDefect?: { id: string; title: string } | null;
};

/** Same ticket code the evidence gallery uses: category prefix + id suffix. */
export function evidenceTicketLabel(category: string, id: string): string {
  const prefix = (category || "GEN").slice(0, 3).toUpperCase();
  const suffix = id.replace(/-/g, "").slice(-4).toUpperCase() || "0000";
  return `#${prefix}-${suffix}`;
}

function BoardCard({ item }: { item: BoardItem }) {
  return (
    <Link
      href={item.href}
      className="group ticket-card card-hover block overflow-hidden rounded-lg"
    >
      {/* Before/after pair — the whole point of evidence. Both slots always
          render side by side (with labels, and the "After image pending"
          placeholder when no after image exists yet), so the pair stays
          visible on phones too — never a single hero image. */}
      <div className="p-4 pb-0">
        <div className="grid grid-cols-2 gap-3">
          <EvidenceImageSlot
            label="Before"
            src={item.beforeImage}
            alt={`${item.title} before`}
            placeholder="Before image missing"
          />
          <EvidenceImageSlot
            label="After"
            src={item.afterImage}
            alt={`${item.title} after`}
            placeholder="After image pending"
          />
        </div>
      </div>

      <div className="p-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <span className="rounded border border-borderDark bg-bg px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-text3">
            {item.ticketLabel}
          </span>
          <DefectStatusBadge status={item.status} className="!px-2 !py-1 !text-[10px]" />
        </div>

        <h3 className="line-clamp-2 text-base font-black leading-snug text-textDefault transition-colors group-hover:text-accent">
          {item.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text2">{item.description}</p>

        {item.linkedDefect && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Link2 size={12} className="shrink-0" />
            <span className="min-w-0 truncate">Linked issue {item.linkedDefect.id}</span>
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-borderDark pt-3 text-[11px] font-mono uppercase tracking-wider text-text3">
          <span>{item.chip ?? "General"}</span>
          <span>{formatDistanceToNow(new Date(item.date), { addSuffix: true })}</span>
        </div>
      </div>
    </Link>
  );
}

export default function BoardGrid({ items }: { items: BoardItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <BoardCard key={item.key} item={item} />
      ))}
    </div>
  );
}
