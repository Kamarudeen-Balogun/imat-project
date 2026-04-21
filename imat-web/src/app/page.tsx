"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  AlertTriangle,
  Users,
  FileCheck,
  ShieldCheck,
  Crown,
  GraduationCap,
  FileText,
  MapPin,
  Megaphone,
  Wrench,
  Building2,
  User,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSiteStats } from "@/hooks/useSiteStats";
import { createSupabaseClient } from "@/lib/supabase/client";
import { ROLE_LABELS, sortByRoleHierarchy, toRoleLabel } from "@/lib/roleHierarchy";
import EvidenceGalleryGrid, { type EvidenceGalleryItem } from "@/components/evidence/EvidenceGalleryGrid";

type MemberSpotlight = {
  id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
};

const fallbackEvidenceItems: EvidenceGalleryItem[] = [
  {
    id: "fallback-1",
    title: "Blocked Drain Grate",
    description: "Drainage obstruction recorded near the walk path. The after slot stays visible until a verified repair image is uploaded.",
    category: "Drainage",
    before_image_url: "/images/Blocked drain grate.webp",
    after_image_url: null,
  },
  {
    id: "fallback-2",
    title: "Crack Concrete Walkway",
    description: "A walkway surface defect used as a live comparison card for before and after reporting.",
    category: "Walkways",
    before_image_url: "/images/Crack concrete walkway.webp",
    after_image_url: null,
  },
  {
    id: "fallback-3",
    title: "Damaged Interlocking Drainage",
    description: "Damaged drainage joints that can be updated with an after photo once the repair is verified.",
    category: "Drainage",
    before_image_url: "/images/Damaged interlocking drainage.webp",
    after_image_url: null,
  },
];

export default function Home() {
  const [filter, setFilter] = useState("All");
  const [spotlightMembers, setSpotlightMembers] = useState<MemberSpotlight[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceGalleryItem[]>(fallbackEvidenceItems);
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const { stats, loading } = useSiteStats(60000);

  useEffect(() => {
    const loadEvidence = async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from("evidence_gallery")
        .select("id, title, description, category, before_image_url, after_image_url, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(6);

      const rows = (data ?? []) as EvidenceGalleryItem[];
      setEvidenceItems(rows.length > 0 ? rows : fallbackEvidenceItems);
      setEvidenceLoading(false);
    };

    const loadMembers = async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from("users")
        .select("id, full_name, role, avatar_url")
        .eq("status", "active")
        .order("joined_at", { ascending: true })
        .limit(200);

      const ordered = sortByRoleHierarchy((data ?? []) as MemberSpotlight[]).slice(0, 5);

      setSpotlightMembers(ordered);
      setMembersLoading(false);
    };

    void loadEvidence();
    void loadMembers();
  }, []);

  const cards = useMemo(() => ([
    { label: "Defects Reported", value: stats.reported, icon: AlertTriangle },
    { label: "Assessments Completed", value: stats.assessmentsCompleted, icon: FileCheck },
    { label: "Issues Resolved", value: stats.resolved, icon: ShieldCheck },
    { label: "Active Members", value: stats.activeMembers, icon: Users },
  ]), [stats]);

  const spotlightRoles = [
    "admin",
    "faculty_advisor",
    "president",
    "vice_president",
    "documentation_officer",
    "field_officer",
    "advocacy_officer",
    "technical_officer",
    "works_dept",
    "member",
  ];

  const getRoleIcon = (role: string | null | undefined) => {
    switch (role) {
      case "admin":
        return ShieldCheck;
      case "faculty_advisor":
        return GraduationCap;
      case "president":
        return Crown;
      case "vice_president":
        return Crown;
      case "documentation_officer":
        return FileText;
      case "field_officer":
        return MapPin;
      case "advocacy_officer":
        return Megaphone;
      case "technical_officer":
        return Wrench;
      case "works_dept":
        return Building2;
      default:
        return User;
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden w-full min-h-[78vh] md:min-h-[80vh] flex items-center justify-center">
        {/* Subtle geometric animated background */}
        <div className="absolute inset-0 bg-bg z-0" />
        <div className="absolute w-[600px] h-[600px] bg-primary/20 blur-[100px] rounded-full top-[-100px] right-[-100px] opacity-30 animate-pulse" />
        <div className="absolute w-[400px] h-[400px] bg-accent/20 blur-[80px] rounded-full bottom-0 left-[-50px] opacity-20" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center pt-16 md:pt-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-mono text-accent text-sm tracking-widest uppercase mb-6 inline-block">Infrastructure Maintenance Awareness Team</span>
            <h1 className="text-balance text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-textDefault mb-6 leading-[0.95] max-w-5xl mx-auto">
              Building a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-success whitespace-nowrap">Culture of Care</span><br />
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
            {cards.map((stat, i) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex flex-col items-center text-center p-6 border border-borderDark rounded-xl bg-bg hover:border-borderLit transition-colors"
              >
                <stat.icon className="w-8 h-8 text-primary mb-4 opacity-80" />
                <span className="text-4xl md:text-5xl font-mono font-bold text-textDefault mb-2">
                  {loading ? "--" : stat.value}
                </span>
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
          {evidenceLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-[420px] rounded-2xl border border-borderDark bg-bg2 animate-pulse" />
              ))}
            </div>
          ) : (
            <EvidenceGalleryGrid
              items={evidenceItems.filter((item) => filter === "All" || item.category === filter).slice(0, 3)}
              mobileHorizontal
              compact
              className="md:overflow-visible"
            />
          )}
        </div>
      </section>

      {/* ORG TEASER */}
      <section className="py-16 md:py-24 bg-bg2 border-t border-borderDark relative z-10 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 left-0 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-textDefault mb-4">Who runs IMAT?</h2>
          <p className="text-base md:text-lg text-text2 max-w-2xl mx-auto mb-8">
            A dedicated team of Civil Engineering students (200L–500L) overseen by a Faculty Advisor. 
            We organize into specific roles to ensure efficient reporting and documentation.
          </p>

          <div className="mb-8">
            <div className="mx-auto max-w-4xl rounded-2xl border border-borderDark/80 bg-bg/70 p-3 md:p-4 backdrop-blur-sm">
              <div className="relative md:hidden overflow-hidden">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-bg2 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-bg2 to-transparent" />
                <div className="flex w-max items-center gap-2.5 animate-role-marquee pr-2">
                  {[...spotlightRoles, ...spotlightRoles].map((role, index) => (
                    <span
                      key={`${role}-${index}`}
                      className="rounded-full border border-primary/25 bg-gradient-to-r from-bg to-bg2 px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text2 shadow-[0_0_0_1px_rgba(59,130,246,0.08)] whitespace-nowrap"
                    >
                      {role === "member" ? "Member" : ROLE_LABELS[role]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="hidden md:flex flex-wrap items-center justify-center gap-2.5">
                {spotlightRoles.map((role, index) => (
                  <motion.span
                    key={role}
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
                    whileHover={{ y: -2, scale: 1.03 }}
                    className="rounded-full border border-primary/25 bg-gradient-to-r from-bg to-bg2 px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text2 shadow-[0_0_0_1px_rgba(59,130,246,0.08)]"
                  >
                    {role === "member" ? "Member" : ROLE_LABELS[role]}
                  </motion.span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 max-w-6xl mx-auto">
            {membersLoading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="rounded-xl border border-borderDark bg-bg p-4 animate-pulse min-h-[118px]" />
                ))
              : spotlightMembers.map((member) => {
                  const initials = (member.full_name || "M").slice(0, 1).toUpperCase();
                  const RoleIcon = getRoleIcon(member.role);
                  return (
                    <div key={member.id} className="rounded-xl border border-borderDark bg-bg/95 p-3.5 text-left hover:border-primary/40 hover:-translate-y-0.5 transition-all">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 shrink-0 rounded-full border border-borderDark overflow-hidden bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center text-[11px] font-bold text-textDefault">
                          {member.avatar_url ? (
                            <Image
                              src={member.avatar_url}
                              alt={member.full_name}
                              width={36}
                              height={36}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-textDefault truncate leading-tight">{member.full_name}</p>
                          <p className="text-[10px] font-mono uppercase tracking-wider text-text3 truncate mt-0.5">
                            {toRoleLabel(member.role)}
                          </p>
                        </div>
                        <div className="ml-auto rounded-lg border border-accent/35 bg-accent/10 p-1.5 text-accent">
                          <RoleIcon size={14} />
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
          
                    <div className="mt-8">
            <Link href="/members" className="text-accent hover:text-accent2 transition-colors font-medium flex items-center justify-center gap-2">
              See all members <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
