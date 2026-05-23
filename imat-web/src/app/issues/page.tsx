"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Clock, CheckCircle } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ExpandableSearch } from "@/components/ExpandableSearch";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { motion } from "framer-motion";
import { sectionReveal } from "@/lib/animations";

type Defect = {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  campus_zones: { name: string } | null;
};

export default function IssuesTrackerPage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reported':
        return <span className="inline-flex items-center gap-1.5 rounded border border-danger/30 bg-danger/10 px-3 py-1 font-mono text-xs font-bold text-danger"><Clock size={12}/> Reported</span>;
      case 'assessed':
      case 'escalated':
        return <span className="inline-flex items-center gap-1.5 rounded border border-warning/35 bg-warning/10 px-3 py-1 font-mono text-xs font-bold text-warning"><AlertCircle size={12}/> Under Assessment</span>;
      case 'acknowledged_by_works':
        return <span className="inline-flex items-center gap-1.5 rounded border border-primary/35 bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary"><AlertCircle size={12}/> Works Notified</span>;
      case 'resolved':
        return <span className="inline-flex items-center gap-1.5 rounded border border-success/35 bg-success/10 px-3 py-1 font-mono text-xs font-bold text-success"><CheckCircle size={12}/> Resolved</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 rounded border border-borderDark bg-bg3 px-3 py-1 font-mono text-xs font-bold uppercase text-text2">{status}</span>;
    }
  };

  const filteredDefects = defects.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) || 
    d.id.toLowerCase().includes(search.toLowerCase())
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
        <div className="mb-8 rounded-lg border border-borderDark bg-asphalt p-5 text-white shadow-2xl sm:p-7">
          <div className="mb-4 inline-flex items-center gap-2 rounded border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-xs font-black uppercase tracking-[0.16em] text-accent">
            Live Defect Registry
          </div>
          <h1 className="mb-4 text-3xl font-black text-white md:text-5xl">Public Issue Tracker</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Live tracking of all reported infrastructural issues on campus. To protect student privacy and field operations, internal severity metrics and officer assignments are hidden.
          </p>
        </div>

        <div className="mb-8 flex justify-end">
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
        <div className="ticket-card overflow-x-auto rounded-lg">
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
      </motion.div>
    </div>
  );
}
