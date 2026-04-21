"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, SlidersHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";
import EvidenceGalleryGrid, { type EvidenceGalleryItem } from "@/components/evidence/EvidenceGalleryGrid";

const fallbackEvidenceItems: EvidenceGalleryItem[] = [
  {
    id: "fallback-1",
    title: "Blocked Drain Grate",
    description: "A public before-and-after comparison card. The after image can be updated once the repair is verified.",
    category: "Drainage",
    before_image_url: "/images/Blocked drain grate.webp",
    after_image_url: null,
  },
  {
    id: "fallback-2",
    title: "Cracked Road Surface",
    description: "Road deterioration documented as a paired evidence item for inspection and follow-up.",
    category: "Roads",
    before_image_url: "/images/Cracked road surface.webp",
    after_image_url: null,
  },
  {
    id: "fallback-3",
    title: "Eroded Corridor Walkway",
    description: "Walkway erosion card prepared for before and after verification shots.",
    category: "Walkways",
    before_image_url: "/images/Eroded corridor walkway.webp",
    after_image_url: null,
  },
];

export default function EvidencePage() {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [items, setItems] = useState<EvidenceGalleryItem[]>(fallbackEvidenceItems);
  const [loading, setLoading] = useState(true);

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
      setItems(rows.length > 0 ? rows : fallbackEvidenceItems);
      setLoading(false);
    };

    void loadEvidence();
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map((item) => item.category)))], [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => categoryFilter === "All" || item.category === categoryFilter);
  }, [categoryFilter, items]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 min-h-screen flex flex-col">
      <Link href="/" className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono mb-8">
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <div className="mb-12">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-primary">
          <Sparkles size={14} /> Before / After Evidence
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-textDefault mb-4">Evidence Gallery</h1>
        <p className="text-text2 max-w-2xl text-lg">
          A continuous, documented record of infrastructural defects on the FUTA campus. Each card shows the original condition and the verified after state side by side.
        </p>
      </div>

      <div className="bg-bg2 border border-borderDark rounded-xl p-4 md:p-6 mb-8 flex flex-col md:flex-row gap-6 items-center">
        <div className="flex items-center gap-2 text-text3 w-full md:w-auto font-mono text-sm uppercase shrink-0">
          <SlidersHorizontal size={16} /> Filters
        </div>
        
        <div className="flex flex-col sm:flex-row w-full gap-4">
          <div className="flex-1">
            <label className="block text-xs uppercase tracking-wider text-text3 mb-2 font-mono">Category</label>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-bg border border-borderDark rounded-lg px-3 py-2 text-sm text-textDefault focus:outline-none focus:border-primary transition-colors"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-[420px] rounded-2xl border border-borderDark bg-bg2 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-borderDark border-dashed bg-bg2 p-12 text-center text-text3">
          No evidence items match your filter.
        </div>
      ) : (
        <EvidenceGalleryGrid items={filteredItems} mobileHorizontal compact className="md:overflow-visible" />
      )}
    </div>
  );
}
