"use client";

import { motion, useInView, useReducedMotion, Variants } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  AlertTriangle,
  Users,
  ShieldCheck,
  Crown,
  GraduationCap,
  FileText,
  MapPin,
  Megaphone,
  Wrench,
  Building2,
  User,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
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

const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

function AnimatedMetricCard({
  label,
  value,
  icon: Icon,
  loading,
  delay,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  loading: boolean;
  delay: number;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.6 });
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (loading) {
      setDisplayValue(0);
      return;
    }

    if (!isInView) {
      return;
    }

    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    let frameId = 0;
    const duration = 1800;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
      }
    };

    frameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isInView, loading, prefersReducedMotion, value]);

  return (
    <motion.div
      ref={cardRef}
      variants={sectionReveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.45 }}
      transition={{ delay }}
      className="glass-panel rounded-2xl p-5"
    >
      <Icon className="mb-4 h-7 w-7 text-primary" />
      <p className="text-3xl font-bold text-textDefault md:text-4xl">{loading ? "--" : displayValue}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-text3">{label}</p>
    </motion.div>
  );
}

export default function Home() {
  const [filter, setFilter] = useState("All");
  const [spotlightMembers, setSpotlightMembers] = useState<MemberSpotlight[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceGalleryItem[]>([]);
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
      setEvidenceItems(rows);
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
    { label: "Under Assessment", value: stats.underAssessment, icon: FileText },
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
    <div className="flex w-full flex-col">
      <section className="relative overflow-hidden pb-20 pt-20 md:pb-28 md:pt-24">
        <div className="pointer-events-none absolute left-[8%] top-[6%] h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-[16%] h-44 w-44 rounded-full bg-success/30 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10"
          >
            <div className="relative z-10">
              <div className="mb-2 inline-flex rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-accent">
                IMAT = Infrastructure Maintenance Awareness Team
              </div>
              <div className="mb-6 inline-flex rounded-full border border-primary/45 bg-primary/10 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-primary">
                FUTA Infrastructure Monitoring Network
              </div>

              <h1 className="text-balance max-w-4xl text-4xl font-bold leading-[0.95] text-textDefault sm:text-5xl lg:text-7xl">
                Campus Problems,
                <span className="block bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent">Engineered Responses.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-text2 sm:text-lg">
                IMAT unifies student reports, evidence validation, and engineering follow-through so every infrastructure issue can be tracked from first alert to verified fix.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/report" className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary px-6 py-3 text-sm font-bold text-bg transition-colors hover:bg-sky-400">
                  Report an Issue
                  <ArrowRight size={16} />
                </Link>
                <Link href="/apply" className="inline-flex items-center justify-center gap-2 rounded-xl border border-borderLit bg-bg2/70 px-6 py-3 text-sm font-semibold text-textDefault transition-colors hover:border-primary/45 hover:text-primary">
                  Join the Team
                </Link>
              </div>
            </div>

          </motion.div>
        </div>
      </section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.22 }}
        className="border-y border-borderDark/80 bg-bg2/65 py-16 md:py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-mono uppercase tracking-[0.18em] text-text3">Operational Coverage</p>
              <h2 className="text-2xl font-bold text-textDefault sm:text-3xl">Live Infrastructure Metrics</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {cards.map((stat, i) => (
              <AnimatedMetricCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                loading={loading}
                delay={i * 0.08}
              />
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="py-20 md:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-mono uppercase tracking-[0.18em] text-text3">Field Intelligence</p>
              <h2 className="text-3xl font-bold text-textDefault md:text-4xl">Evidence Gallery</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text2 md:text-base">
                Verified media logs create traceability and help maintenance stakeholders prioritize urgent defects across campus.
              </p>
            </div>
            <Link href="/evidence" className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-textDefault">
              Open Full Evidence Board <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mb-7 flex flex-wrap gap-2">
            {["All", "Drainage", "Roads", "Walkways", "Structures"].map((category) => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                  filter === category
                    ? "border-primary bg-primary text-bg"
                    : "border-borderDark bg-bg2/80 text-text2 hover:border-borderLit"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {evidenceLoading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-[420px] animate-pulse rounded-2xl border border-borderDark bg-bg2" />
              ))}
            </div>
          ) : evidenceItems.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-text3">
              No evidence items are published yet. Upload the first before-and-after record from the dashboard to populate this section.
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
      </motion.section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="border-t border-borderDark/80 bg-bg2/65 py-16 md:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <p className="mb-2 text-xs font-mono uppercase tracking-[0.18em] text-text3">Human Infrastructure</p>
          <h2 className="text-3xl font-bold text-textDefault md:text-4xl">The Team Behind The System</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-text2 md:text-base">
            From field officers to technical leadership, IMAT runs as a coordinated engineering operation with clear responsibilities.
          </p>

          <div className="mx-auto mb-10 mt-8 max-w-4xl rounded-2xl border border-borderDark/80 bg-bg/70 p-3 md:p-4">
            <div className="relative overflow-hidden md:hidden">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-bg2 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-bg2 to-transparent" />
              <div className="animate-role-marquee flex w-max items-center gap-2.5 pr-2">
                {[...spotlightRoles, ...spotlightRoles].map((role, index) => (
                  <span
                    key={`${role}-${index}`}
                    className="whitespace-nowrap rounded-full border border-primary/25 bg-gradient-to-r from-bg to-bg2 px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text2 shadow-[0_0_0_1px_rgba(59,130,246,0.08)]"
                  >
                    {role === "member" ? "Member" : ROLE_LABELS[role]}
                  </span>
                ))}
              </div>
            </div>

            <div className="hidden flex-wrap items-center justify-center gap-2.5 md:flex">
              {spotlightRoles.map((role, index) => (
                <motion.span
                  key={role}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
                  whileHover={{ y: -2, scale: 1.03 }}
                  className="rounded-full border border-primary/25 bg-gradient-to-r from-bg to-bg2 px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text2 shadow-[0_0_0_1px_rgba(59,130,246,0.08)]"
                >
                  {role === "member" ? "Member" : ROLE_LABELS[role]}
                </motion.span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {membersLoading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="min-h-[120px] animate-pulse rounded-xl border border-borderDark bg-bg p-4" />
                ))
              : spotlightMembers.map((member) => {
                  const initials = (member.full_name || "M").slice(0, 1).toUpperCase();
                  const RoleIcon = getRoleIcon(member.role);

                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.45 }}
                      transition={{ duration: 0.35 }}
                      className="glass-panel rounded-xl p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-borderDark bg-gradient-to-br from-primary/30 to-accent/20 text-[11px] font-bold text-textDefault">
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
                          <p className="truncate text-sm font-semibold leading-tight text-textDefault">{member.full_name}</p>
                          <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-text3">
                            {toRoleLabel(member.role)}
                          </p>
                        </div>
                        <div className="ml-auto rounded-lg border border-accent/35 bg-accent/10 p-1.5 text-accent">
                          <RoleIcon size={14} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
          </div>

          <div className="mt-9">
            <Link href="/members" className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-accent2">
              See All Members <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </motion.section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.35 }}
        className="py-14"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="glass-panel flex flex-col items-start justify-between gap-6 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="mb-1 text-xs font-mono uppercase tracking-[0.16em] text-text3">Move From Complaint To Closure</p>
              <h3 className="text-2xl font-bold text-textDefault">Ready to log a campus defect with evidence?</h3>
            </div>
            <Link href="/report" className="inline-flex items-center gap-2 rounded-xl border border-success/40 bg-success/20 px-5 py-3 text-sm font-bold text-success transition-colors hover:bg-success/30">
              Submit Report
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
}


