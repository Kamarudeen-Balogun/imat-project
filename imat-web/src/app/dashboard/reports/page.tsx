"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { FileText, Download, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

type ReportRecord = {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  authored_by: { full_name: string } | null;
  defects_included: string[];
};

export default function ReportsMasterlist() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("reports")
        .select(`
          id, 
          title, 
          period_start, 
          period_end, 
          status, 
          created_at, 
          defects_included,
          authored_by:users!reports_authored_by_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (data && !error) {
        setReports(data as unknown as ReportRecord[]);
      }
      setLoading(false);
    };

    fetchReports();
  }, []);

   return (
     <div className="mx-auto max-w-7xl px-4 py-6 animate-in fade-in duration-500 sm:px-6">
       <Breadcrumbs className="mb-8" />
       <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2 flex items-center gap-2">
             <FileText className="text-primary"/> Engineering Reports
          </h1>
          <p className="text-text2">
            Quarterly and Biannual PDF assessment reports for the Works & Physical Planning Department.
          </p>
        </div>
        
        <Link href="/dashboard/reports/new" className="bg-primary hover:brightness-110 text-white font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm">
          <Plus size={16} /> Generate New Report
        </Link>
      </div>

      {loading ? (
        <div className="glass-panel rounded-xl p-8 text-center">
          <Loader2 size={28} className="mx-auto mb-3 animate-spin text-primary" />
          <p className="font-mono text-text3">Compiling report indices...</p>
          <p className="mt-1 text-sm text-text3">Loading…</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-panel rounded-xl p-8 text-center font-mono text-text3">
          NO REPORTS GENERATED YET
        </div>
      ) : (
      <>
      {/* Desktop: table. Phones: stacked cards. */}
      <div className="glass-panel overflow-x-auto rounded-xl hidden md:block">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-bg border-b border-soft font-mono text-[10px] uppercase text-text3 tracking-wider">
              <th className="p-4 font-medium">Report Details</th>
              <th className="p-4 font-medium">Period</th>
              <th className="p-4 font-medium">Author</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Defects</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderDark/50 text-sm text-textDefault">
            {reports.map(report => (
                <tr key={report.id} className="hover:bg-bg/50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-textDefault">{report.title}</div>
                    <div className="text-[10px] text-text3 mt-1 uppercase">{formatDistanceToNow(new Date(report.created_at))} ago</div>
                  </td>
                  <td className="p-4 text-text2 font-mono text-xs">
                    {report.period_start} TO {report.period_end}
                  </td>
                  <td className="p-4 text-text2">
                    {report.authored_by?.full_name || "Unknown Author"}
                  </td>
                  <td className="p-4">
                     {report.status === 'published' ? (
                       <span className="bg-success/20 text-success border border-success/30 px-2 py-0.5 rounded font-bold font-mono text-xs">PUBLISHED</span>
                     ) : (
                       <span className="bg-warningDim text-warning border border-warning/30 px-2 py-0.5 rounded font-bold font-mono text-xs">DRAFT</span>
                     )}
                  </td>
                  <td className="p-4 text-text2">
                    {report.defects_included.length} Incidents
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/dashboard/reports/${report.id}`} className="text-xs text-primary hover:text-primary dark:hover:text-primary font-bold underline flex items-center justify-end gap-1">
                       <Download size={14}/> Download PDF
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {reports.map((report) => (
          <article key={report.id} className="glass-panel rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="min-w-0 flex-1 text-base font-bold leading-snug text-textDefault">
                {report.title}
              </h2>
              {report.status === "published" ? (
                <span className="bg-success/20 text-success border border-success/30 px-2 py-0.5 rounded font-bold font-mono text-xs">PUBLISHED</span>
              ) : (
                <span className="bg-warningDim text-warning border border-warning/30 px-2 py-0.5 rounded font-bold font-mono text-xs">DRAFT</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text2">
              <span>
                {format(new Date(report.period_start), "MMM d, yyyy")} –{" "}
                {format(new Date(report.period_end), "MMM d, yyyy")}
              </span>
              <span>{report.authored_by?.full_name || "Unknown Author"}</span>
              <span>{report.defects_included.length} incidents</span>
              <span>{formatDistanceToNow(new Date(report.created_at))} ago</span>
            </div>
            <Link
              href={`/dashboard/reports/${report.id}`}
              className="btn btn-outline mt-4 w-full"
            >
              <Download size={14} /> Download PDF
            </Link>
          </article>
        ))}
      </div>
      </>
      )}
    </div>
  );
}

