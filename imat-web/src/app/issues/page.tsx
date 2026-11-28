"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageOff } from "lucide-react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ExpandableSearch } from "@/components/ExpandableSearch";
import FilterChips from "@/components/list/FilterChips";
import DefectStatusBadge from "@/components/defects/DefectStatusBadge";
import { publicStatusGroup } from "@/lib/defects";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { motion } from "framer-motion";
import { sectionReveal } from "@/lib/animations";

type Defect = {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  photos: string[] | null;
  campus_zones: { name: string } | null;
};

export default function IssuesTrackerPage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  useEffect(() => {
    const fetchDefects = async () => {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("defects")
        .select(`
          id, 
          title, 
          category, 
          status, 
          created_at,
          photos,
          campus_zones(name)
        `)
        .order("created_at", { ascending: false });

      if (data && !error) {
        setDefects(data as unknown as Defect[]);
      }
      setLoading(false);
    };

    fetchDefects();
  }, []);

  const getStatusBadge = (status: string) => <DefectStatusBadge status={status} />;

  const searchedDefects = useMemo(
    () =>
      defects.filter(
        (d) =>
          d.title.toLowerCase().includes(search.toLowerCase()) ||
          d.id.toLowerCase().includes(search.toLowerCase()),
      ),
    [defects, search],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: searchedDefects.length,
      reported: 0,
      under_assessment: 0,
      acknowledged_by_works: 0,
      resolved: 0,
    };
    for (const d of searchedDefects) {
      const group = publicStatusGroup(d.status);
      if (counts[group] !== undefined) counts[group] += 1;
    }
    return counts;
  }, [searchedDefects]);

  const filteredDefects = useMemo(
    () =>
      activeStatus === "all"
        ? searchedDefects
        : searchedDefects.filter((d) => publicStatusGroup(d.status) === activeStatus),
    [searchedDefects, activeStatus],
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-12 sm:px-6 sm:py-16">
      <Breadcrumbs className="mb-8" />

      <motion.div
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div className="mb-8 rounded-lg border border-borderDark bg-asphalt p-5 text-white shadow-lg sm:p-7">
          <div className="mb-4 inline-flex items-center gap-2 rounded border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-xs font-black uppercase tracking-[0.16em] text-accent">
            Live Defect Registry
          </div>
          <h1 className="mb-4 text-3xl font-black text-white md:text-5xl">Public Issue Tracker</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Live tracking of all reported infrastructural issues on campus. To protect student privacy and field operations, internal severity metrics and officer assignments are hidden.
          </p>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:max-w-[34rem]">
            <FilterChips
              chips={[
                { id: "all", label: "All", count: statusCounts.all },
                { id: "reported", label: "Reported", count: statusCounts.reported },
                { id: "under_assessment", label: "Under Assessment", count: statusCounts.under_assessment },
                { id: "acknowledged_by_works", label: "Works Notified", count: statusCounts.acknowledged_by_works },
                { id: "resolved", label: "Resolved", count: statusCounts.resolved },
              ]}
              activeId={activeStatus}
              onChange={setActiveStatus}
              ariaLabel="Filter issues by status"
            />
          </div>
          <ExpandableSearch
            placeholder="Search issues..."
            value={search}
            onChange={setSearch}
            className="w-full sm:w-[22rem]"
          />
        </div>
      </motion.div>

      <motion.div
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {/* Desktop: table. Phones: stacked cards with a photo thumbnail —
            tapping a card opens the public defect detail view. */}
        <div className="ticket-card hidden overflow-x-auto rounded-lg md:block">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-borderDark bg-bg font-mono text-xs uppercase tracking-wider text-text3">
              <th className="p-4 font-medium">Issue ID / Title</th>
              <th className="p-4 font-medium">Location Zone</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">Date Reported</th>
              <th className="p-4 font-medium text-right">Current Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderDark/50 text-sm text-textDefault">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-text3 font-mono">
                  Loading reports...
                </td>
              </tr>
            ) : filteredDefects.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center border-dashed flex-col items-center justify-center bg-bg/50 text-text3 font-mono">
                  NO DEFECTS FOUND
                </td>
              </tr>
            ) : (
              filteredDefects.map(defect => (
                <tr key={defect.id} className="hover:bg-bg/50 transition-colors">
                  <td className="p-4">
                    <div className="font-mono text-xs text-text3 mb-1">{defect.id}</div>
                    <div className="font-medium text-textDefault max-w-sm truncate">{defect.title}</div>
                  </td>
                  <td className="p-4 text-text2">
                    {defect.campus_zones?.name || <span className="text-text3 italic">Unspecified</span>}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 uppercase tracking-wider text-[10px] font-bold bg-bg3 text-text2 rounded border border-borderDark">
                      {defect.category}
                    </span>
                  </td>
                  <td className="p-4 text-text2 font-mono text-xs">
                     {formatDistanceToNow(new Date(defect.created_at), { addSuffix: true })}
                  </td>
                  <td className="p-4 text-right">
                    {getStatusBadge(defect.status)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {loading ? (
          <div className="p-12 text-center text-text3 font-mono">Loading reports...</div>
        ) : filteredDefects.length === 0 ? (
          <div className="empty-state">No defects found.</div>
        ) : (
          filteredDefects.map((defect) => {
            const firstPhoto = defect.photos?.[0];
            return (
              <Link
                key={defect.id}
                href={`/issues/${defect.id}`}
                className="ticket-card block overflow-hidden rounded-lg transition-colors hover:border-primary/50"
              >
                {firstPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={firstPhoto} alt="" className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-20 w-full items-center justify-center gap-2 bg-bg3 text-text3">
                    <ImageOff size={18} />
                    <span className="text-xs font-mono uppercase tracking-wider">No photo</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="min-w-0 flex-1 text-base font-bold leading-snug text-textDefault">
                      {defect.title}
                    </h2>
                    {getStatusBadge(defect.status)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-text2">
                    <span className="font-mono">{defect.id}</span>
                    <span>{defect.campus_zones?.name || "Unspecified zone"}</span>
                    <span className="uppercase tracking-wider">{defect.category}</span>
                    <span>{formatDistanceToNow(new Date(defect.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
      </motion.div>
    </div>
  );
}
