"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, AlertTriangle, Users, FileCheck, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [filter, setFilter] = useState("All");
  
  const stats = [
    { label: "Defects Reported", value: 142, icon: AlertTriangle },
    { label: "Assessments Completed", value: 98, icon: FileCheck },
    { label: "Issues Resolved", value: 45, icon: ShieldCheck },
    { label: "Active Members", value: 24, icon: Users },
  ];

  return (
    <div className="flex flex-col w-full">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden w-full min-h-[78vh] md:min-h-[80vh] flex items-center justify-center">
        {/* Subtle geometric animated background */}
        <div className="absolute inset-0 bg-bg z-0" />
        <div className="absolute w-[600px] h-[600px] bg-primary/20 blur-[100px] rounded-full top-[-100px] right-[-100px] opacity-30 animate-pulse" />
        <div className="absolute w-[400px] h-[400px] bg-accent/20 blur-[80px] rounded-full bottom-0 left-[-50px] opacity-20" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center pt-16 md:pt-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-mono text-accent text-sm tracking-widest uppercase mb-6 inline-block">Infrastructure Maintenance Awareness Team</span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-textDefault mb-6 leading-tight">
              Building a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-success">Culture of Care</span><br />
              for FUTA Infrastructure
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-text2 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
              Bridging the gap between students and university management through systematic monitoring, 
              advocacy, and volunteer engineering support.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/apply" className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-blue-500 text-bg2 font-bold rounded-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                Apply to Join <ArrowRight size={18} />
              </Link>
              <Link href="/report" className="w-full sm:w-auto px-8 py-4 bg-transparent border border-borderLit hover:border-textDefault hover:bg-bg2 text-textDefault font-medium rounded-lg transition-colors flex items-center justify-center">
                Report an Issue
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* IMPACT COUNTER */}
      <section className="py-16 md:py-20 border-y border-borderDark bg-bg2 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-sm font-mono text-text3 tracking-widest uppercase">Our Impact in Numbers</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12">
            {stats.map((stat, i) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex flex-col items-center text-center p-6 border border-borderDark rounded-xl bg-bg hover:border-borderLit transition-colors"
              >
                <stat.icon className="w-8 h-8 text-primary mb-4 opacity-80" />
                {/* Note: Animate counter would go here, using static value for now until data is hooked up */}
                <span className="text-4xl md:text-5xl font-mono font-bold text-textDefault mb-2">{stat.value}</span>
                <span className="text-sm text-text2">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* EVIDENCE GALLERY (Preview) */}
      <section className="py-20 md:py-32 relative z-10 bg-bg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-textDefault mb-4">Evidence Gallery</h2>
              <p className="text-text2 max-w-xl">
                Documenting physical campus defects and tracking them to resolution. Our field officers assess and log issues continuously.
              </p>
            </div>
            <Link href="/evidence" className="text-primary hover:text-textDefault mt-4 md:mt-0 flex items-center gap-2 font-medium transition-colors">
              View full tracker <ArrowRight size={16} />
            </Link>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            {["All", "Drainage", "Roads", "Walkways", "Structures"].map(c => (
              <button 
                key={c}
                onClick={() => setFilter(c)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${filter === c ? 'bg-primary text-bg2 border-primary' : 'bg-bg2 text-text2 border-borderDark hover:border-text3'}`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Evidence Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { src: "/images/Blocked drain grate.webp", title: "Blocked drain grate", category: "Drainage", severity: 4 },
              { src: "/images/Crack concrete walkway.webp", title: "Crack concrete walkway", category: "Walkways", severity: 2 },
              { src: "/images/Cracked road surface.webp", title: "Cracked road surface", category: "Roads", severity: 3 },
              { src: "/images/Damaged interlocking drainage.webp", title: "Damaged interlocking drainage", category: "Drainage", severity: 3 },
              { src: "/images/Eroded corridor walkway.webp", title: "Eroded corridor walkway", category: "Walkways", severity: 4 },
              { src: "/images/Overgrown culvert.webp", title: "Overgrown culvert", category: "Drainage", severity: 3 }
            ].filter(defect => filter === "All" || defect.category === filter)
             .map((defect, i) => (
              <div key={i} className="group cursor-pointer rounded-xl border border-borderDark overflow-hidden bg-bg2 hover:border-primary/50 transition-colors flex flex-col">
                <div className="h-48 bg-bg3 relative overflow-hidden">
                  <Image
                    src={defect.src}
                    alt={defect.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-semibold text-textDefault group-hover:text-primary transition-colors line-clamp-1">{defect.title}</h3>
                      <span className="text-[10px] font-mono px-2 py-1 bg-warningDim text-warning rounded shrink-0">Open</span>
                    </div>
                    <p className="text-sm text-text2 line-clamp-2 mb-4">
                      Documented physical defect requiring attention and maintenance assessment. This issue has been logged by Field Officers.
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-borderDark pt-4 mt-auto">
                    <div className="flex items-center gap-2 text-xs font-mono text-text3">
                       <span className={`px-2 py-1 rounded ${defect.severity >= 4 ? 'bg-dangerDim text-danger' : defect.severity == 3 ? 'bg-warningDim text-warning' : 'bg-primaryDim text-primary'}`}>Severity {defect.severity}</span> 
                       <span>•</span> 
                       <span>{defect.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ORG TEASER */}
      <section className="py-20 md:py-32 bg-bg2 border-t border-borderDark relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-textDefault mb-6">Who runs IMAT?</h2>
          <p className="text-lg text-text2 max-w-2xl mx-auto mb-16">
            A dedicated team of Civil Engineering students (200L–500L) overseen by a Faculty Advisor. 
            We organize into specific roles to ensure efficient reporting and documentation.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto">
            {["Field Officer", "Documentation Officer", "Advocacy Officer", "Technical Officer", "President & VP", "Faculty Advisor"].map((role) => (
              <div key={role} className="p-6 border border-borderDark rounded-xl bg-bg flex flex-col items-center justify-center text-center">
                <span className="font-semibold text-textDefault">{role}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-12">
            <Link href="/about" className="text-accent hover:text-accent2 transition-colors font-medium flex items-center justify-center gap-2">
              Read more about our organizational structure <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
