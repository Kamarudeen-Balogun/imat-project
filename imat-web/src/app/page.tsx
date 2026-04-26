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

function useTypewriter(text: string, speed = 70, delay = 800) {
  const [displayText, setDisplayText] = useState("");
  const [phase, setPhase] = useState<'idle' | 'typing' | 'paused' | 'deleting'>('idle');

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setPhase('typing');
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [delay]);

  useEffect(() => {
    let index = 0;

    if (phase === 'typing') {
      const typingInterval = setInterval(() => {
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(typingInterval);
          setPhase('paused');
        }
      }, speed);

      return () => clearInterval(typingInterval);
    }

    if (phase === 'paused') {
      const pauseTimeout = setTimeout(() => {
        setPhase('deleting');
      }, 2500);

      return () => clearTimeout(pauseTimeout);
    }

    if (phase === 'deleting') {
      const deleteInterval = setInterval(() => {
        setDisplayText(current => {
          if (current.length === 0) {
            clearInterval(deleteInterval);
            setPhase('typing');
            return '';
          }
          return current.slice(0, Math.max(0, current.length - 3));
        });
      }, 30);

      return () => clearInterval(deleteInterval);
    }
  }, [text, speed, phase]);

  return { 
    displayText, 
    showCursor: phase === 'typing' || phase === 'paused' 
  };
}

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
      className="group relative overflow-hidden rounded-2xl border border-borderDark bg-bg/60 p-5 transition-all hover:border-primary/40 hover:shadow-glow"
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 transition-transform group-hover:scale-150" />
      <div className="relative">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-3xl font-bold text-textDefault md:text-4xl">
          {loading ? "--" : displayValue}
        </p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-text3">{label}</p>
      </div>
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
  const typewriter = useTypewriter("Infrastructure Maintenance Awareness Team");

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
      <section className="relative overflow-hidden pb-20 pt-16 md:pb-24 md:pt-20">
        <div className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full bg-primary/20 blur-[100px]" />
        <div className="pointer-events-none absolute -right-20 top-20 h-72 w-72 rounded-full bg-success/15 blur-[80px]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-accent/10 blur-[60px]" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary via-accent to-success opacity-20 blur-xl" />
            <div className="absolute inset-0 rounded-3xl bg-bg opacity-90" />
            <div className="relative rounded-3xl border border-borderDark bg-bg/80 p-6 sm:p-8 lg:p-10 backdrop-blur-sm">
              <div className="mb-5 flex gap-2">
              <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-[0.12em] whitespace-nowrap text-accent sm:gap-1.5 sm:px-3 sm:text-[11px] sm:tracking-[0.16em]">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                {typewriter.displayText}
                <span className={`${typewriter.showCursor ? 'opacity-100' : 'opacity-0'} text-accent animate-pulse`}>|</span>
              </span>
            </div>

              <h1 className="text-balance mb-4 max-w-4xl text-4xl font-bold leading-[0.95] text-textDefault sm:text-5xl lg:text-6xl">
                Campus Problems,
                <span className="block mt-1 bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent">
                  Engineered Responses.
                </span>
              </h1>

              <p className="mb-6 max-w-2xl text-base leading-relaxed text-text2 sm:text-lg">
                IMAT unifies student reports, evidence validation, and engineering follow-through so every infrastructure issue can be tracked from first alert to verified fix.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link 
                  href="/report" 
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary bg-primary px-6 py-3 text-sm font-bold text-white transition-all hover:border-primary/80 hover:shadow-glow focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 btn-press"
                >
                  Report an Issue
                  <ArrowRight size={16} />
                </Link>
                <Link 
                  href="/apply" 
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-borderLit bg-bg2/80 px-6 py-3 text-sm font-semibold text-textDefault transition-all hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 btn-press"
                >
                  Join the Team
                  <ArrowRight size={16} />
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
        className="border-y border-borderDark bg-bg2/40 py-14 md:py-18"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-mono font-semibold uppercase tracking-[0.18em] text-accent">Operational Coverage</p>
              <h2 className="text-2xl font-bold text-textDefault sm:text-3xl">Live Infrastructure Metrics</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        className="py-16 md:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-mono font-semibold uppercase tracking-[0.18em] text-accent">Field Intelligence</p>
              <h2 className="text-3xl font-bold text-textDefault md:text-4xl">Evidence Gallery</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text2 md:text-base">
                Verified media logs create traceability and help maintenance stakeholders prioritize urgent defects across campus.
              </p>
            </div>
            <Link href="/evidence" className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-accent">
              Open Full Evidence Board <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mb-7 flex flex-wrap gap-2">
            {["All", "Drainage", "Roads", "Walkways", "Structures"].map((category) => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-all ${
                  filter === category
                    ? "border-primary bg-primary text-white shadow-glow"
                    : "border-borderDark/50 bg-bg2/60 text-text2 hover:border-accent hover:text-accent"
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
        className="border-t border-borderDark bg-bg2/40 py-14 md:py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <p className="mb-2 text-xs font-mono font-semibold uppercase tracking-[0.18em] text-accent">Human Infrastructure</p>
          <h2 className="text-3xl font-bold text-textDefault md:text-4xl">The Team Behind The System</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-text2 md:text-base">
            From field officers to technical leadership, IMAT runs as a coordinated engineering operation with clear responsibilities.
          </p>

          <div className="mx-auto mb-10 mt-8 max-w-4xl rounded-2xl border border-soft bg-bg/70 p-3 md:p-4">
            <div className="relative overflow-hidden md:hidden">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-bg2 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-bg2 to-transparent" />
              <div className="animate-role-marquee flex w-max items-center gap-2.5 pr-2">
                {[...spotlightRoles, ...spotlightRoles].map((role, index) => (
                  <span
                    key={`${role}-${index}`}
                    className="whitespace-nowrap rounded-full border border-soft bg-gradient-to-r from-bg to-bg2 px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text2"
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
                  className="rounded-full border border-soft bg-gradient-to-r from-bg to-bg2 px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text2"
                >
                  {role === "member" ? "Member" : ROLE_LABELS[role]}
                </motion.span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {membersLoading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="min-h-[120px] skeleton-shimmer rounded-xl border border-borderDark/40 bg-bg2/40 p-4" />
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
                      className="group relative overflow-hidden rounded-xl border border-borderDark bg-bg/60 p-3.5 text-left transition-all hover:-translate-y-1 hover:border-accent/50 hover:shadow-glow-accent"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-borderLit/50 bg-gradient-to-br from-primary/20 to-accent/10 text-[11px] font-bold text-textDefault">
                          {member.avatar_url ? (
                            <Image
                              src={member.avatar_url}
                              alt={member.full_name}
                              width={40}
                              height={40}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold leading-tight text-textDefault">{member.full_name}</p>
                          <p className="mt-0.5 truncate font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">
                            {toRoleLabel(member.role)}
                          </p>
                        </div>
                        <div className="ml-auto rounded-lg border border-accent/30 bg-accent/10 p-1.5 text-accent">
                          <RoleIcon size={14} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
          </div>

          <div className="mt-9">
            <Link href="/members" className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-white hover:bg-accent rounded-full px-4 py-2">
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
          <div className="relative overflow-hidden rounded-3xl border border-borderDark bg-gradient-to-r from-bg2 to-bg p-6 sm:p-8">
            <div className="absolute -right-20 top-0 h-40 w-40 rounded-full bg-accent/10 blur-[60px]" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="mb-2 text-xs font-mono font-semibold uppercase tracking-[0.16em] text-accent">Move From Complaint To Closure</p>
                <h3 className="text-2xl font-bold text-textDefault lg:text-[1.7rem] lg:leading-tight">Ready to log a campus defect with evidence?</h3>
              </div>

              <Link href="/report" className="inline-flex w-fit items-center gap-2 rounded-xl border-2 border-success bg-success px-5 py-3 text-sm font-bold text-white transition-all hover:bg-success/90 hover:shadow-glow-success focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 btn-press lg:px-4 lg:py-2.5 lg:text-[13px]">
                Submit Report
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}


