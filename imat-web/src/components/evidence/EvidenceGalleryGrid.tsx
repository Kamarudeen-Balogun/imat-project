"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import optimizeCloudinaryUrl from "../../lib/cloudinary";
import { AlertTriangle, ArrowRight, Camera, CheckCircle, ChevronsLeftRight, Clock, ImageOff, Link2, X } from "lucide-react";
import { motion } from "framer-motion";

export type EvidenceGalleryItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  before_image_url: string;
  after_image_url: string | null;
  sort_order?: number;
  is_active?: boolean;
  defect_id?: string | null;
  defect?: { id: string; title: string } | null;
};

type EvidenceGalleryGridProps = {
  items: EvidenceGalleryItem[];
  mobileHorizontal?: boolean;
  compact?: boolean;
  className?: string;
};

export function EvidenceImageSlot({
  label,
  src,
  alt,
  placeholder,
}: {
  label: string;
  src?: string | null;
  alt: string;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded border border-borderDark bg-bg px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-text3">
          {label}
        </span>
      </div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-borderDark bg-bg3">
        {src ? (
          (() => {
            let finalSrc = src;
            try {
              if (finalSrc && finalSrc.includes("res.cloudinary.com")) {
                finalSrc = optimizeCloudinaryUrl(finalSrc as string);
              }
            } catch {
              // fall back to original src on any parsing error
            }

            return (
              <Image
                src={finalSrc as string}
                alt={alt}
                fill
                unoptimized
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            );
          })()
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-bg2 to-bg3 px-4 text-center text-text3">
            <ImageOff size={18} />
            <span className="text-[11px] font-mono uppercase tracking-wider">{placeholder ?? "Image pending"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function getTicketId(item: EvidenceGalleryItem) {
  const prefix = (item.category || "GEN").slice(0, 3).toUpperCase();
  const suffix = item.id.replace(/-/g, "").slice(-4).toUpperCase() || "0000";
  return `#${prefix}-${suffix}`;
}

function getEvidenceStatus(item: EvidenceGalleryItem) {
  if (item.after_image_url) {
    return {
      label: "Resolved",
      className: "border-success/35 bg-success/10 text-success",
      Icon: CheckCircle,
    };
  }

  return {
    label: "Under Assessment",
    className: "border-warning/40 bg-warning/10 text-warning",
    Icon: Clock,
  };
}

export default function EvidenceGalleryGrid({
  items,
  mobileHorizontal = true,
  compact = false,
  className = "",
}: EvidenceGalleryGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EvidenceGalleryItem | null>(null);

  useEffect(() => {
    if (!mobileHorizontal) return;

    const el = scrollContainerRef.current;
    if (!el) return;

    const updateScrollState = () => {
      const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      const hasOverflow = maxScrollLeft > 8;
      setShowSwipeHint(hasOverflow);
      setCanScrollLeft(el.scrollLeft > 8);
      setCanScrollRight(el.scrollLeft < maxScrollLeft - 8);
    };

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [items, mobileHorizontal]);

  useEffect(() => {
    if (!selectedItem) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedItem(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [selectedItem]);

  const containerClasses = mobileHorizontal
    ? "flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:pb-0"
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";

  return (
    <div className="relative">
      {mobileHorizontal && showSwipeHint && (
        <div className="mb-3 flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-text3 md:hidden">
          <ChevronsLeftRight size={14} className="text-primary" />
          Swipe to explore more evidence cards
        </div>
      )}

      <div ref={scrollContainerRef} className={`${containerClasses} ${className}`.trim()}>
        {items.map((item, index) => (
          <motion.article
            key={item.id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: index * 0.06, duration: 0.35 }}
            onClick={() => setSelectedItem(item)}
            className={`group ticket-card shrink-0 snap-start rounded-lg p-4 transition-all hover:-translate-y-0.5 hover:border-accent/60 ${
              mobileHorizontal ? "w-[82vw] sm:w-[420px] md:w-auto" : "w-full"
            }`}
          >
            {(() => {
              const status = getEvidenceStatus(item);
              const StatusIcon = status.Icon;
              return (
                <>
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-borderDark pb-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded border border-borderDark bg-bg px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-text3">
                          {getTicketId(item)}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${status.className}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </div>
                      <h3 className={`font-black text-textDefault transition-colors group-hover:text-accent ${compact ? "text-base" : "text-lg"}`}>
                        {item.title}
                      </h3>
                    </div>
                    <span className="rounded border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider text-primary">
                      {item.category}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <EvidenceImageSlot
                      label="Before"
                      src={item.before_image_url}
                      alt={`${item.title} before`}
                      placeholder="Before image missing"
                    />
                    <EvidenceImageSlot
                      label="After"
                      src={item.after_image_url}
                      alt={`${item.title} after`}
                      placeholder="After image pending"
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    <p className={`text-text2 ${compact ? "text-sm line-clamp-2" : "text-sm line-clamp-3"}`}>
                      {item.description}
                    </p>
                    {item.defect && (
                      <Link
                        href={`/issues/${item.defect.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                      >
                        <Link2 size={13} className="shrink-0" />
                        <span className="min-w-0 truncate">
                          Linked issue {item.defect.id} — {item.defect.title}
                        </span>
                        <ArrowRight size={12} className="ml-auto shrink-0" />
                      </Link>
                    )}
                    <div className="grid grid-cols-3 gap-2 border-y border-borderDark py-3 text-[9px] font-mono uppercase tracking-[0.12em] text-text3">
                      <span className="flex items-center gap-1"><AlertTriangle size={11} className="text-danger" /> Reported</span>
                      <span className="flex items-center gap-1"><Camera size={11} className="text-warning" /> Verified</span>
                      <span className={`flex items-center gap-1 ${item.after_image_url ? "text-success" : "text-text3"}`}>
                        <CheckCircle size={11} /> {item.after_image_url ? "Resolved" : "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-text3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedItem(item);
                        }}
                        className="inline-flex items-center gap-1 rounded border border-borderDark bg-bg px-2.5 py-1.5 text-accent transition-colors hover:border-accent"
                        aria-label={`View full details for ${item.title}`}
                      >
                        Open Ticket <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.article>
        ))}
      </div>

      {selectedItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Evidence details for ${selectedItem.title}`}
          onClick={() => setSelectedItem(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-4xl overflow-hidden rounded-lg border border-borderDark bg-bg shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-borderDark bg-bg2 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded border border-borderDark bg-bg px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-text3">
                    {getTicketId(selectedItem)}
                  </span>
                  <span className="rounded border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-primary">
                    {selectedItem.category}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-textDefault sm:text-2xl">{selectedItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-md border border-borderDark bg-bg p-2 text-text3 transition-colors hover:border-primary hover:text-primary"
                aria-label="Close evidence details"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[78vh] overflow-y-auto p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <EvidenceImageSlot
                  label="Before"
                  src={selectedItem.before_image_url}
                  alt={`${selectedItem.title} before`}
                  placeholder="Before image missing"
                />
                <EvidenceImageSlot
                  label="After"
                  src={selectedItem.after_image_url}
                  alt={`${selectedItem.title} after`}
                  placeholder="After image pending"
                />
              </div>

              <div className="mt-5 rounded-lg border border-borderDark bg-bg2/60 p-4">
                <h4 className="mb-2 text-sm font-mono uppercase tracking-wider text-text3">Details</h4>
                <p className="text-sm leading-relaxed text-text2 sm:text-base">{selectedItem.description}</p>
                {selectedItem.defect && (
                  <Link
                    href={`/issues/${selectedItem.defect.id}`}
                    className="mt-4 flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    <Link2 size={13} className="shrink-0" />
                    <span className="min-w-0 truncate">
                      Linked issue {selectedItem.defect.id} — {selectedItem.defect.title}
                    </span>
                    <ArrowRight size={12} className="ml-auto shrink-0" />
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {mobileHorizontal && showSwipeHint && (
        <>
          <div
            className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-bg via-bg/85 to-transparent transition-opacity md:hidden ${
              canScrollLeft ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bg via-bg/85 to-transparent transition-opacity md:hidden ${
              canScrollRight ? "opacity-100" : "opacity-0"
            }`}
          />
        </>
      )}
    </div>
  );
}
