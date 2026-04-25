"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal, Sparkles, ChevronDown, Check } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import EvidenceGalleryGrid, { type EvidenceGalleryItem } from "@/components/evidence/EvidenceGalleryGrid";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export default function EvidencePage() {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<EvidenceGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!categoryMenuRef.current) return;
      if (!categoryMenuRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadEvidence = async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from("evidence_gallery")
        .select("id, title, description, category, before_image_url, after_image_url, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      const rows = (data ?? []) as EvidenceGalleryItem[];
      setItems(rows);
      setLoading(false);
    };

    void loadEvidence();
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map((item) => item.category)))], [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => categoryFilter === "All" || item.category === categoryFilter);
  }, [categoryFilter, items]);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-16 sm:px-6">
      <Breadcrumbs className="mb-8" />

      <div className="mb-12">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-primary">
          <Sparkles size={14} /> Before / After Evidence
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-textDefault mb-4">Evidence Gallery</h1>
        <p className="text-text2 max-w-2xl text-lg">
          A continuous, documented record of infrastructural defects on the FUTA campus. Each card shows the original condition and the verified after state side by side.
        </p>
      </div>

      <div className="glass-panel relative z-30 mb-8 flex flex-col items-center gap-6 overflow-visible rounded-xl p-4 md:flex-row md:p-6">
        <div className="flex items-center gap-2 text-text3 w-full md:w-auto font-mono text-sm uppercase shrink-0">
          <SlidersHorizontal size={16} /> Filters
        </div>
        
        <div className="flex flex-col sm:flex-row w-full gap-4">
          <div className="flex-1">
            <label className="block text-xs uppercase tracking-wider text-text3 mb-2 font-mono">Category</label>
            <div className="relative" ref={categoryMenuRef}>
              <button
                type="button"
                onClick={() => setIsCategoryOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded-lg border border-borderDark bg-surfaceStrong px-3 py-2 text-sm text-textDefault transition-colors hover:border-primary/50 focus:border-primary focus:outline-none"
                aria-expanded={isCategoryOpen}
                aria-label="Select evidence category"
              >
                <span className="truncate">{categoryFilter}</span>
                <ChevronDown size={16} className={`transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
              </button>

              {isCategoryOpen && (
                <div className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-lg border border-borderDark bg-bg shadow-xl shadow-black/20">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setCategoryFilter(category);
                        setIsCategoryOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-textDefault transition-colors hover:bg-primary/10"
                    >
                      <span className="truncate">{category}</span>
                      {categoryFilter === category && <Check size={15} className="text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-[420px] rounded-2xl border border-borderDark bg-surface animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-text3">
          No evidence items have been published yet. Add the first record in the dashboard evidence manager.
        </div>
      ) : (
        <EvidenceGalleryGrid items={filteredItems} mobileHorizontal={false} compact className="md:overflow-visible" />
      )}
    </div>
  );
}
