"use client";

import { useState } from "react";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function EvidencePage() {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  
  const categories = ["All", "Drainage", "Roads", "Walkways", "Structures", "Other"];
  const severities = ["All", "1 - Cosmetic", "2 - Minor", "3 - Moderate", "4 - Critical", "5 - Emergency"];

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 min-h-screen flex flex-col">
      <Link href="/" className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono mb-8">
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-textDefault mb-4">Evidence Gallery</h1>
        <p className="text-text2 max-w-2xl text-lg">
          A continuous, documented record of infrastructural defects on the FUTA campus. This public log ensures transparency and tracking from report to resolution.
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
              className="w-full bg-bg border border-borderDark rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs uppercase tracking-wider text-text3 mb-2 font-mono">Severity</label>
            <select 
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full bg-bg border border-borderDark rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
            >
              {severities.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[
          { src: "/images/Blocked drain grate.webp", title: "Blocked drain grate", category: "Drainage", severity: 4 },
          { src: "/images/Blocked drainage.webp", title: "Blocked drainage", category: "Drainage", severity: 3 },
          { src: "/images/Crack concrete walkway.webp", title: "Crack concrete walkway", category: "Walkways", severity: 2 },
          { src: "/images/Cracked road surface.webp", title: "Cracked road surface", category: "Roads", severity: 3 },
          { src: "/images/Damaged interlocking drainage.webp", title: "Damaged interlocking drainage", category: "Drainage", severity: 4 },
          { src: "/images/Eroded corridor walkway.webp", title: "Eroded corridor walkway", category: "Walkways", severity: 4 },
          { src: "/images/Eroded paved area.webp", title: "Eroded paved area", category: "Walkways", severity: 3 },
          { src: "/images/Overgrown culvert.webp", title: "Overgrown culvert", category: "Drainage", severity: 3 }
        ]
        .filter(d => categoryFilter === "All" || d.category === categoryFilter)
        .filter(d => severityFilter === "All" || d.severity.toString() === severityFilter.charAt(0))
        .map((defect, i) => (
          <div key={i} className="group cursor-pointer rounded-xl border border-borderDark overflow-hidden bg-bg2 hover:border-primary/50 transition-colors flex flex-col">
            <div className="h-40 bg-bg3 relative overflow-hidden">
              <Image
                src={defect.src}
                alt={defect.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-semibold text-textDefault text-sm group-hover:text-primary transition-colors line-clamp-2">{defect.title}</h3>
              </div>
              <div className="mt-auto pt-3 flex flex-wrap gap-2 text-[10px] font-mono font-bold">
                 <span className={`px-2 py-1 rounded ${defect.severity >= 4 ? 'bg-dangerDim text-danger' : defect.severity == 3 ? 'bg-warningDim text-warning' : 'bg-primaryDim text-primary'}`}>SEV {defect.severity}</span> 
                 <span className="px-2 py-1 rounded bg-bg3 text-text2">{defect.category}</span>
              </div>
            </div>
          </div>
        ))}
        {/* Placeholder if filters hide all */}
        <div className="col-span-full hidden last:flex p-12 text-center border border-borderDark border-dashed rounded-xl flex-col items-center justify-center bg-bg/50">
          <p className="text-text3 font-mono mb-4 text-sm">NO DEFECTS MATCH FILTER</p>
        </div>
      </div>
    </div>
  );
}
