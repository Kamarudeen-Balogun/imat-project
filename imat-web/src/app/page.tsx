"use client";

import { motion, Variants } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle,
  Clock,
  FileText,
  Gauge,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSiteStats } from "@/hooks/useSiteStats";
import { createSupabaseClient } from "@/lib/supabase/client";
import {
  ANNOUNCEMENT_CARD_SELECT,
  ANNOUNCEMENT_CARD_SELECT_WITH_PIN,
  isMissingPinnedColumn,
  normalizeAnnouncementAuthor,
} from "@/lib/announcements";
import EvidenceGalleryGrid, { type EvidenceGalleryItem } from "@/components/evidence/EvidenceGalleryGrid";

type HomeAnnouncement = {
  id: string;
  slug: string | null;
  title: string;
  body: string;
  visibility: "public" | "members_only";
  published_at: string;
  image_url: string | null;
  is_pinned?: boolean | null;
  author: { full_name: string | null } | null;
};

const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

function StatusStep({
  icon: Icon,
  label,
  text,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  text: string;
  tone: string;
}) {
  return (
    <div className="ticket-card status-rail rounded-lg p-5 pl-6 text-textDefault" style={{ color: tone }}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-current/35 bg-current/10">
          <Icon size={18} />
        </span>
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-textDefault">{label}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text2">{text}</p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [filter, setFilter] = useState("All");
  const [evidenceItems, setEvidenceItems] = useState<EvidenceGalleryItem[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<HomeAnnouncement[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
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

      setEvidenceItems((data ?? []) as EvidenceGalleryItem[]);
      setEvidenceLoading(false);
    };

    const loadAnnouncements = async () => {
      const supabase = createSupabaseClient();
      const pinnedResult = await supabase
        .from("announcements")
        .select(ANNOUNCEMENT_CARD_SELECT_WITH_PIN)
        .eq("visibility", "public")
        .order("is_pinned", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(2);
      let data: unknown[] | null = pinnedResult.data;
      let error = pinnedResult.error;

      if (isMissingPinnedColumn(error)) {
        const fallback = await supabase
          .from("announcements")
          .select(ANNOUNCEMENT_CARD_SELECT)
          .eq("visibility", "public")
          .order("published_at", { ascending: false })
          .limit(2);

        data = fallback.data as unknown[] | null;
        error = fallback.error;
      }

      if (error) {
        setNewsLoading(false);
        return;
      }

      setAnnouncements(
        ((data ?? []) as unknown as Array<Omit<HomeAnnouncement, "author"> & { author: { full_name: string | null } | { full_name: string | null }[] | null }>).map(
          normalizeAnnouncementAuthor
        )
      );
      setNewsLoading(false);
    };

    void loadEvidence();
    void loadAnnouncements();
  }, []);

  const cards = useMemo(
    () => [
      { label: "Defects Reported", value: stats.reported, icon: AlertTriangle, tone: "orange" as const },
      { label: "Under Assessment", value: stats.underAssessment, icon: Clock, tone: "amber" as const },
      { label: "Issues Resolved", value: stats.resolved, icon: ShieldCheck, tone: "green" as const },
      { label: "Active Members", value: stats.activeMembers, icon: Users, tone: "teal" as const },
    ],
    [stats]
  );

  return (
    <div className="flex w-full flex-col">
      <section className="relative overflow-hidden bg-asphalt text-white">
        <div className="blueprint-grid absolute inset-0 opacity-20" />
        <div className="relative mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded border border-accent/45 bg-accent/10 px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-accent">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Live campus infrastructure hub
            </div>

            <h1 className="max-w-4xl text-balance text-4xl font-black leading-[0.96] tracking-tight text-white sm:text-5xl lg:text-7xl">
              IMAT Infrastructure Command Center
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              A structured reporting and evidence platform for campus defects, technical review, and verified maintenance follow-through.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/report"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-accent bg-accent px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-accent2 btn-press"
              >
                Report Issue
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/issues"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/5 px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition-colors hover:border-primary hover:text-primary btn-press"
              >
                View Tracker
                <Gauge size={16} />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="rounded-lg border border-white/15 bg-white/[0.04] p-4 shadow-2xl shadow-black/30"
          >
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Operations Board</p>
                <h2 className="mt-1 text-xl font-black text-white">Live Infrastructure Metrics</h2>
              </div>
              <Activity className="text-accent" size={22} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {cards.map((stat, i) => (
                <div key={stat.label} className="rounded-md border border-white/10 bg-black/20 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <stat.icon className="text-accent" size={18} />
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">KPI 0{i + 1}</span>
                  </div>
                  <p className="font-mono text-3xl font-black text-white">{loading ? "--" : stat.value}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
              <div className="rounded border border-white/10 bg-white/[0.03] p-3">
                <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">Input</span>
                Public reports
              </div>
              <div className="rounded border border-white/10 bg-white/[0.03] p-3">
                <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">Review</span>
                Technical assessment
              </div>
              <div className="rounded border border-white/10 bg-white/[0.03] p-3">
                <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">Output</span>
                Verified closure
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.18 }}
        className="py-14 md:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 font-mono text-xs font-black uppercase tracking-[0.18em] text-accent">Field Intelligence</p>
              <h2 className="text-3xl font-black text-textDefault md:text-4xl">Evidence Ticket Board</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text2 md:text-base">
                Published records document defect conditions, categories, and before / after proof for accountable maintenance follow-through.
              </p>
            </div>
            <Link href="/evidence" className="inline-flex items-center gap-2 rounded-md border border-borderDark bg-surfaceStrong px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-textDefault transition-colors hover:border-accent hover:text-accent">
              Full Board <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mb-7 flex flex-wrap gap-2">
            {["All", "Drainage", "Roads", "Walkways", "Structures"].map((category) => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`rounded-md border px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition-all ${
                  filter === category
                    ? "border-accent bg-accent text-white"
                    : "border-borderDark bg-surfaceStrong text-text2 hover:border-accent hover:text-accent"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {evidenceLoading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-[420px] animate-pulse rounded-lg border border-borderDark bg-bg2" />
              ))}
            </div>
          ) : evidenceItems.length === 0 ? (
            <div className="ticket-card rounded-lg p-8 text-center text-text3">
              No evidence items are published yet. Upload the first before-and-after record from the dashboard to populate this board.
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
        viewport={{ once: true, amount: 0.18 }}
        className="border-y border-borderDark bg-bg2/70 py-14 md:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 font-mono text-xs font-black uppercase tracking-[0.18em] text-accent">Newsroom</p>
              <h2 className="text-3xl font-black text-textDefault md:text-4xl">Latest Broadcasts</h2>
            </div>
            <Link href="/newsroom" className="inline-flex items-center gap-2 rounded-md border border-borderDark bg-surfaceStrong px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-textDefault transition-colors hover:border-accent hover:text-accent">
              Open Newsroom <ArrowRight size={15} />
            </Link>
          </div>

          {newsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-40 animate-pulse rounded-lg border border-borderDark bg-bg3" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="ticket-card rounded-lg p-6 text-sm text-text3">
              No public broadcasts are published yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {announcements.map((item) => (
                <Link
                  key={item.id}
                  href={`/newsroom/${item.slug ?? item.id}`}
                  className="ticket-card group rounded-lg p-5 transition-all hover:-translate-y-0.5 hover:border-accent/60"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-accent">
                      {item.is_pinned ? "Pinned Broadcast" : item.visibility === "public" ? "Public Broadcast" : "Internal Broadcast"}
                    </span>
                    <span className="text-[10px] text-text3">
                      {new Date(item.published_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="line-clamp-2 text-lg font-black text-textDefault group-hover:text-accent">{item.title}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-text2">{item.body}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.18 }}
        className="border-y border-borderDark bg-bg2/70 py-14 md:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 max-w-3xl">
            <p className="mb-2 font-mono text-xs font-black uppercase tracking-[0.18em] text-accent">Complaint To Closure</p>
            <h2 className="text-3xl font-black text-textDefault md:text-4xl">Traceable Maintenance Workflow</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <StatusStep icon={Camera} label="Report" text="Students submit structured defect data, photos, GPS, category, and severity." tone="var(--danger)" />
            <StatusStep icon={FileText} label="Verify" text="Field and technical officers assess the defect and validate the record." tone="var(--warning)" />
            <StatusStep icon={Building2} label="Route" text="Works Department liaison receives clean, actionable infrastructure context." tone="var(--primary)" />
            <StatusStep icon={CheckCircle} label="Resolve" text="Before / after evidence and status updates close the public accountability loop." tone="var(--success)" />
          </div>
        </div>
      </motion.section>

    </div>
  );
}
