"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Search, AlertCircle, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";

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
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold font-mono"><Clock size={12}/> Received</span>;
      case 'assessed':
      case 'escalated':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-bold font-mono"><AlertCircle size={12}/> Under Assessment</span>;
      case 'acknowledged_by_works':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold font-mono"><AlertCircle size={12}/> Works Dept. Notified</span>;
      case 'resolved':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-bold font-mono"><CheckCircle size={12}/> Resolved</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg3 text-text2 text-xs font-bold font-mono uppercase">{status}</span>;
    }
  };

  const filteredDefects = defects.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) || 
    d.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 min-h-screen flex flex-col">
      <Link href="/" className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono mb-8">
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-textDefault mb-4">Public Issue Tracker</h1>
        <p className="text-text2 max-w-2xl text-lg">
          Live tracking of all reported infrastructural issues on campus. To protect student privacy and field operations, internal severity metrics and officer assignments are hidden.
        </p>
      </div>

      <div className="bg-bg2 border border-borderDark rounded-xl p-4 mb-8 flex items-center gap-3">
         <Search size={20} className="text-text3" />
         <input 
           type="text" 
           placeholder="Search by issue title or ID (e.g. DEF-1A2B)..." 
           value={search}
           onChange={e => setSearch(e.target.value)}
           className="w-full bg-transparent border-none focus:outline-none text-textDefault placeholder-text3 font-mono text-sm"
         />
      </div>

      <div className="bg-bg2 border border-borderDark rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-bg border-b border-borderDark font-mono text-xs uppercase text-text3 tracking-wider">
              <th className="p-4 rounded-tl-xl font-medium">Issue ID / Title</th>
              <th className="p-4 font-medium">Location Zone</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">Date Reported</th>
              <th className="p-4 rounded-tr-xl font-medium text-right">Current Status</th>
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
    </div>
  );
}
