"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Map as MapIcon, Filter, AlertTriangle, FileText } from "lucide-react";
import { ExpandableSearch } from "@/components/ExpandableSearch";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

type DefectRecord = {
  id: string;
  title: string;
  category: string;
  severity: number;
  status: string;
  created_at: string;
  location_lat: number | null;
  location_lng: number | null;
  campus_zones: { name: string } | null;
  assignee: { full_name: string } | null; // Officer assigned
};

export default function InternalDefectsLogPage() {
  const [defects, setDefects] = useState<DefectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");

  useEffect(() => {
    const fetchInternalDefects = async () => {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("defects")
        .select(`
          id, 
          title, 
          category, 
          severity, 
          status, 
          created_at, 
          location_lat, 
          location_lng,
          campus_zones(name),
          assignee:users!defects_assigned_to_fkey(full_name) 
        `)
        .order("created_at", { ascending: false });

      if (data && !error) {
        setDefects(data as unknown as DefectRecord[]);
      }
      setLoading(false);
    };

    fetchInternalDefects();
  }, []);

  const STATUS_BADGE: Record<string, string> = {
    reported: "badge-warning",
    assessed: "badge-info",
    escalated: "badge-danger",
    acknowledged_by_works: "badge-accent",
    resolved: "badge-success",
  };

  const getSeverityBadge = (level: number) => {
    switch(level) {
      case 5: return <span className="badge badge-severity badge-danger font-mono">LVL 5 (CRITICAL)</span>;
      case 4: return <span className="badge badge-severity badge-warning font-mono">LVL 4 (HIGH)</span>;
      case 3: return <span className="badge badge-severity badge-info font-mono">LVL 3 (MODERATE)</span>;
      default: return <span className="badge badge-severity badge-neutral font-mono">LVL {level} (MINOR)</span>;
    }
  };

  const filteredDefects = defects.filter(d => {
    const matchesSearch = d.id.toLowerCase().includes(search.toLowerCase()) || 
                          d.title.toLowerCase().includes(search.toLowerCase()) ||
                          d.campus_zones?.name.toLowerCase().includes(search.toLowerCase());
    
    if (filterSeverity === "all") return matchesSearch;
    return matchesSearch && d.severity === parseInt(filterSeverity);
  });

   return (
     <div className="mx-auto max-w-7xl px-4 py-6 animate-in fade-in duration-500 sm:px-6">
       
       <Breadcrumbs className="mb-8" />
       
       <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2 flex items-center gap-2">
             <AlertTriangle className="text-warning"/> Defect Masterlist (Internal)
          </h1>
          <p className="text-text2">
            Secure administrative view. Contains sensitive engineering metrics, officer assignments, and direct GPS vectors.
          </p>
        </div>
        
        <Link href="/dashboard/defects/new" className="bg-warning hover:bg-orange-500 text-black font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm shadow-lg shadow-warning/20">
          + New Assessment
        </Link>
      </div>

         <div className="glass-panel mb-6 flex flex-col gap-4 rounded-xl p-4 md:flex-row">
            <div className="flex-grow flex items-center gap-3 rounded-lg border border-soft bg-surfaceStrong px-4 py-2">
            <ExpandableSearch placeholder="Search defect IDs, titles, or zones..." value={search} onChange={setSearch} className="w-full" />
            </div>
            <div className="flex min-w-[200px] items-center gap-3 rounded-lg border border-soft bg-surfaceStrong px-4 py-2">
               <Filter size={18} className="text-text3" />
               <select 
                 value={filterSeverity} 
                 onChange={e => setFilterSeverity(e.target.value)}
                 className="w-full bg-transparent border-none focus:outline-none text-textDefault text-sm font-mono appearance-none"
               >
                 <option value="all">All Severities</option>
                 <option value="5">Level 5 (Emergency)</option>
                 <option value="4">Level 4 (Critical)</option>
                 <option value="3">Level 3 (Moderate)</option>
                 <option value="2">Level 2 (Minor)</option>
                 <option value="1">Level 1 (Cosmetic)</option>
               </select>
            </div>
         </div>

      <div className="glass-panel overflow-x-auto rounded-xl shadow-xl">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-bg border-b border-soft font-mono text-[10px] uppercase text-text3 tracking-wider">
              <th className="p-4 font-medium">Tracking ID / Title</th>
              <th className="p-4 font-medium">Recorded Severity</th>
              <th className="p-4 font-medium">FUTA Zone</th>
              <th className="p-4 font-medium">Field Officer</th>
              <th className="p-4 font-medium">GPS Vector</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderDark/50 text-sm text-textDefault">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-text3 font-mono">
                  Loading secure database records...
                </td>
              </tr>
            ) : filteredDefects.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-text3 font-mono bg-bg/50">
                  NO INTERNAL RECORDS FOUND
                </td>
              </tr>
            ) : (
              filteredDefects.map(defect => (
                <tr key={defect.id} className="hover:bg-bg/50 transition-colors">
                  <td className="p-4">
                    <div className="font-mono text-xs text-text3 mb-1">{defect.id}</div>
                    <div className="font-medium max-w-[200px] truncate" title={defect.title}>{defect.title}</div>
                    <div className="text-[10px] text-text3 mt-1 uppercase">{formatDistanceToNow(new Date(defect.created_at))} ago</div>
                  </td>
                  <td className="p-4">
                    {getSeverityBadge(defect.severity)}
                  </td>
                  <td className="p-4 text-text2 max-w-[150px] truncate">
                    {defect.campus_zones?.name || "Unmapped"}
                  </td>
                  <td className="p-4 text-text2">
                    {defect.assignee?.full_name || <span className="text-text3 italic text-xs">Unassigned</span>}
                  </td>
                  <td className="p-4">
                    {defect.location_lat && defect.location_lng ? (
                       <a 
                         href={`https://www.google.com/maps/search/?api=1&query=${defect.location_lat},${defect.location_lng}`} 
                         target="_blank" rel="noreferrer"
                         className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-mono text-xs hover:underline"
                       >
                         <MapIcon size={12}/> View Map
                       </a>
                    ) : (
                       <span className="text-text3 font-mono text-xs">NO SAT DATA</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`badge ${STATUS_BADGE[defect.status] ?? "badge-neutral"}`}>
                      {defect.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/dashboard/defects/${defect.id}`} className="text-xs text-text2 hover:text-primary underline flex items-center justify-end gap-1 w-full">
                       <FileText size={14}/> Assess Full Setup
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

