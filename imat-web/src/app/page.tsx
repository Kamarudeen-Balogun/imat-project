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
  Megaphone,
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
import BoardGrid, { evidenceTicketLabel, type BoardItem } from "@/components/home/BoardGrid";
import FilterChips from "@/components/list/FilterChips";
import { BOARD_CHIPS, boardCategory, type BoardChip } from "@/lib/defects";
import { getAnnouncementHref } from "@/lib/news";

type HomeAnnouncement = {
  id: string;
  slug: string | null;
  title: string;
  body: string;
  visibility: "public" | "members_only";
  published_at: string | null;
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
  index,
  label,
  text,
  tone,
}: {
  icon: LucideIcon;
  index: number;
  label: string;
  text: string;
  tone: string;
}) {
  return (
    <div className="card relative p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="font-mono text-2xl font-black tabular-nums" style={{ color: tone }}>
          {String(index).padStart(2, "0")}
        </span>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ color: tone, background: `color-mix(in oklab, ${tone} 12%, transparent)` }}
        >
          <Icon size={18} />
        </span>
      </div>
      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-textDefault">{label}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text2">{text}</p>
    </div>
  );
}

type HomeEvidenceItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  before_image_url: string;
  after_image_url: string | null;
  sort_order?: number;
  is_active?: boolean;
  created_at: string;
  defect_id?: string | null;
};

export default function Home() {
  const [filter, setFilter] = useState<BoardChip>("All");
  const [evidenceItems, setEvidenceItems] = useState<HomeEvidenceItem[]>([]);
  const [linkedDefects, setLinkedDefects] = useState<Map<string, { id: string; title: string }>>(new Map());
  const [boardLoading, setBoardLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<HomeAnnouncement[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const { stats, loading } = useSiteStats(60000);

  useEffect(() => {
    const loadBoard = async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from("evidence_gallery")
        .select("id, title, description, category, before_image_url, after_image_url, sort_order, is_active, created_at, defect_id")
        .eq("is_active", true)
        .eq("status", "published")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(6);

      const evidence = (data ?? []) as HomeEvidenceItem[];
      setEvidenceItems(evidence);

      // Resolve the linked issue title for each evidence item, for the
      // "Linked issue" line on its card.
      const ids = Array.from(
        new Set(evidence.map((item) => item.defect_id).filter((id): id is string => Boolean(id)))
      );
      if (ids.length > 0) {
        const { data: linked } = await supabase.from("defects").select("id, title").in("id", ids);
        setLinkedDefects(
          new Map(((linked ?? []) as Array<{ id: string; title: string }>).map((d) => [d.id, d]))
        );
      } else {
        setLinkedDefects(new Map());
      }
      setBoardLoading(false);
    };

    const loadAnnouncements = async () => {
      const supabase = createSupabaseClient();
      const pinnedResult = await supabase
        .from("announcements")
        .select(ANNOUNCEMENT_CARD_SELECT_WITH_PIN)
        .eq("visibility", "public")
        .eq("status", "published")
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
          .eq("status", "published")
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

    void loadBoard();
    void loadAnnouncements();
  }, []);

  // Evidence only: the board is the published before/after record. Issues
  // live on the tracker (/issues) and are reached from the buttons in the
  // section header; each evidence card still links to its own issue.
  const boardItems = useMemo<BoardItem[]>(() => {
    return evidenceItems
      .map((item) => ({
        key: `evidence-${item.id}`,
        title: item.title,
        description: item.description,
        chip: boardCategory(item.category),
        date: item.created_at,
        beforeImage: item.before_image_url,
        afterImage: item.after_image_url,
        href: item.defect_id ? `/issues/${item.defect_id}` : "/evidence",
        status: item.after_image_url ? "resolved" : "assessed",
        ticketLabel: evidenceTicketLabel(item.category, item.id),
        linkedDefect: item.defect_id ? linkedDefects.get(item.defect_id) ?? null : null,
      }))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [evidenceItems, linkedDefects]);

  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = { All: boardItems.length };
    for (const chip of BOARD_CHIPS) {
      if (chip !== "All") counts[chip] = boardItems.filter((item) => item.chip === chip).length;
    }
    return counts;
  }, [boardItems]);

  const filteredBoard = useMemo(
    () => (filter === "All" ? boardItems : boardItems.filter((item) => item.chip === filter)),
    [boardItems, filter]
  );
  const visibleBoard = useMemo(() => filteredBoard.slice(0, 6), [filteredBoard]);

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
        <div className="relative mx-auto grid min-h-[560px] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:min-h-[640px] lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <h1 className="max-w-4xl text-balance text-4xl font-black leading-[0.96] tracking-tight text-white sm:text-5xl lg:text-7xl">
              IMAT Infrastructure Command Center
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              A structured reporting and evidence platform for campus defects, technical review, and verified maintenance follow-through.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/report"
                className="btn-accent btn-lg"
              >
                Report Issue
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/issues"
                className="btn-dark-ghost btn-lg"
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
            className="rounded-lg border border-white/15 bg-white/[0.04] p-4shadow-lg shadow-black/20"
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
                  <p className="font-mono text-3xl font-black tabular-nums text-white">{loading ? <span className="skeleton-shimmer inline-block h-9 w-14 rounded" /> : stat.value}</p>
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
        className="pt-12 lg:pt-16 pb-8 lg:pb-10"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Field Intelligence</p>
              <h2 className="page-title">Evidence Ticket Board</h2>
              <p className="page-lede">
                Published before-and-after proof that reported defects turn into verified repairs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/evidence" className="btn-outline btn-sm">
                Full Board <ArrowRight size={15} />
              </Link>
              <Link href="/issues" className="btn-outline btn-sm">
                View issue tracker <ArrowRight size={15} />
              </Link>
              <Link href="/report" className="btn btn-accent btn-sm">
                Record an issue <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div className="mb-7">
            <FilterChips
              chips={BOARD_CHIPS.map((chip) => ({ id: chip, label: chip, count: chipCounts[chip] ?? 0 }))}
              activeId={filter}
              onChange={(id) => setFilter(id as BoardChip)}
              ariaLabel="Filter board by category"
            />
          </div>

          {boardLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-[420px] animate-pulse rounded-lg border border-borderDark bg-bg2" />
              ))}
            </div>
          ) : boardItems.length === 0 ? (
            <div className="empty-state">
              <Camera size={28} className="mx-auto mb-3 text-text3" />
              <p className="font-bold text-textDefault">No evidence items are published yet.</p>
              <p className="mt-1">Evidence appears here once a repair is verified — report a defect to start one.</p>
              <Link href="/report" className="btn btn-accent btn-sm mt-4">
                Report a defect
              </Link>
            </div>
          ) : filteredBoard.length === 0 ? (
            <div className="empty-state">
              Nothing in this category yet — try another filter.
            </div>
          ) : (
            <>
              <BoardGrid items={visibleBoard} />
              <div className="mt-7 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <p className="text-xs font-mono uppercase tracking-wider text-text3">
                  Showing {visibleBoard.length} of {filteredBoard.length} record{filteredBoard.length === 1 ? "" : "s"}
                  {filter !== "All" ? ` in ${filter}` : ""}
                </p>
                <Link href="/report" className="btn btn-accent btn-sm">
                  Report a defect <ArrowRight size={15} />
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.18 }}
        className="border-y border-borderDark bg-bg2/70 pt-8 lg:pt-10 pb-12 lg:pb-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Newsroom</p>
              <h2 className="page-title">Latest Broadcasts</h2>
            </div>
            <Link href="/newsroom" className="btn-outline btn-sm">
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
            <div className="empty-state">
              <Megaphone size={28} className="mx-auto mb-3 text-text3" />
              <p className="font-bold text-textDefault">No public broadcasts are published yet.</p>
              <p className="mt-1">Check back soon — new broadcasts appear here first.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {announcements.map((item) => (
                <Link
                  key={item.id}
                  href={getAnnouncementHref(item.slug ?? item.id)}
                  className="card card-hover group p-5"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-accent">
                      {item.is_pinned ? "Pinned Broadcast" : item.visibility === "public" ? "Public Broadcast" : "Internal Broadcast"}
                    </span>
                    <span className="text-[10px] text-text3">
                      {item.published_at ? new Date(item.published_at).toLocaleDateString() : ""}
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
        className="pt-12 lg:pt-16 pb-8 lg:pb-10"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 max-w-3xl">
            <p className="eyebrow">Complaint To Closure</p>
            <h2 className="page-title">Traceable Maintenance Workflow</h2>
          </div>
          <div className="relative">
            {/* Connector: a dashed line across the step numbers on desktop,
                visible only in the gaps between cards. */}
            <div aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-9 hidden border-t-2 border-dashed border-borderDark md:block" />
            <div className="relative grid gap-4 md:grid-cols-4">
              <StatusStep index={1} icon={Camera} label="Report" text="Students submit structured defect data, photos, GPS, category, and severity." tone="var(--danger)" />
              <StatusStep index={2} icon={FileText} label="Verify" text="Field and technical officers assess the defect and validate the record." tone="var(--warning)" />
              <StatusStep index={3} icon={Building2} label="Route" text="Works Department liaison receives clean, actionable infrastructure context." tone="var(--primary)" />
              <StatusStep index={4} icon={CheckCircle} label="Resolve" text="Before / after evidence and status updates close the public accountability loop." tone="var(--success)" />
            </div>
          </div>
        </div>
      </motion.section>

    </div>
  );
}
