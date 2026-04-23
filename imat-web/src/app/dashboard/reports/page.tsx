"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { FileText, Download, Plus } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
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
        
        <Link href="/dashboard/reports/new" className="bg-primary hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm shadow-lg shadow-primary/20">
          <Plus size={16} /> Generate New Report
        </Link>
      </div>

      <div className="glass-panel overflow-x-auto rounded-xl shadow-xl">
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
            {loading ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-text3 font-mono">
                  Compiling report indices...
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-text3 font-mono bg-bg/50">
                  NO REPORTS GENERATED YET
                </td>
              </tr>
            ) : (
              reports.map(report => (
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
                    <Link href={`/dashboard/reports/${report.id}`} className="text-xs text-primary hover:text-blue-400 font-bold underline flex items-center justify-end gap-1">
                       <Download size={14}/> Download PDF
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

