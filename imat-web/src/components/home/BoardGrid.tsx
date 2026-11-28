"use client";

import Image from "next/image";
import Link from "next/link";
import { ImageOff, Link2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import DefectStatusBadge from "@/components/defects/DefectStatusBadge";
import optimizeCloudinaryUrl from "@/lib/cloudinary";
import type { BoardChip } from "@/lib/defects";

export type BoardItem = {
  kind: "evidence" | "defect";
  key: string;
  title: string;
  description: string;
  chip: Exclude<BoardChip, "All"> | null;
  zone: string | null;
  date: string;
  image: string | null;
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

function boardImageSrc(url: string): string {
  return url.includes("res.cloudinary.com") ? optimizeCloudinaryUrl(url) : url;
}

function BoardCard({ item }: { item: BoardItem }) {
  return (
    <Link
      href={item.href}
      className="group ticket-card card-hover block overflow-hidden rounded-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-bg3">
        {item.image ? (
          <Image
            src={boardImageSrc(item.image)}
            alt={item.title}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-text3">
            <ImageOff size={20} />
            <span className="text-[11px] font-mono uppercase tracking-wider">No photo</span>
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded border px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider ${
            item.kind === "evidence"
              ? "border-primary/40 bg-black/55 text-white"
              : "border-accent/50 bg-black/55 text-white"
          }`}
        >
          {item.kind === "evidence" ? "Evidence" : "Issue"}
        </span>
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

        {item.kind === "evidence" && item.linkedDefect && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Link2 size={12} className="shrink-0" />
            <span className="min-w-0 truncate">Linked issue {item.linkedDefect.id}</span>
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-borderDark pt-3 text-[11px] font-mono uppercase tracking-wider text-text3">
          <span>{item.chip ?? "General"}</span>
          <span className="min-w-0 truncate">{item.zone ?? "Unspecified zone"}</span>
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
