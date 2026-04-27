"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImageOff, ArrowRight, ChevronsLeftRight, X } from "lucide-react";
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
};

type EvidenceGalleryGridProps = {
  items: EvidenceGalleryItem[];
  mobileHorizontal?: boolean;
  compact?: boolean;
  className?: string;
};

function EvidenceImageSlot({
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
        <span className="rounded-full border border-borderDark bg-bg px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-text3">
          {label}
        </span>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-borderDark bg-bg3 aspect-[4/3]">
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
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
            className={`group shrink-0 snap-start rounded-2xl border border-borderDark bg-gradient-to-b from-bg2 to-bg p-4 shadow-lg shadow-black/5 transition-all hover:-translate-y-1 hover:border-primary/40 ${
              mobileHorizontal ? "w-[82vw] sm:w-[420px] md:w-auto" : "w-full"
            }`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-primary">
                  {item.category}
                </div>
                <h3 className={`font-bold text-textDefault group-hover:text-primary transition-colors ${compact ? "text-base" : "text-lg"}`}>
                  {item.title}
                </h3>
              </div>
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
              <div className="flex items-center justify-between border-t border-borderDark pt-3 text-[10px] font-mono uppercase tracking-wider text-text3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedItem(item);
                  }}
                  className="inline-flex items-center gap-1 text-accent transition-colors hover:text-primary"
                  aria-label={`View full details for ${item.title}`}
                >
                  View <ArrowRight size={12} />
                </button>
              </div>
            </div>
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
            className="w-full max-w-4xl overflow-hidden rounded-2xl border border-borderDark bg-bg shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-borderDark bg-bg2 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <span className="mb-2 inline-flex rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-primary">
                  {selectedItem.category}
                </span>
                <h3 className="text-xl font-bold text-textDefault sm:text-2xl">{selectedItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-lg border border-borderDark bg-bg p-2 text-text3 transition-colors hover:border-primary hover:text-primary"
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

              <div className="mt-5 rounded-xl border border-borderDark bg-bg2/60 p-4">
                <h4 className="mb-2 text-sm font-mono uppercase tracking-wider text-text3">Details</h4>
                <p className="text-sm leading-relaxed text-text2 sm:text-base">{selectedItem.description}</p>
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
