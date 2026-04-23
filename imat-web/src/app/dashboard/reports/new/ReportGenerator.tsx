"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { FileText, Download, Loader2 } from "lucide-react";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { ReportDocument } from "@/components/pdf/ReportDocument";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { logActivityEvent } from "@/lib/activity/logEvent";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

function isMobileLikeDevice() {
  if (typeof navigator === "undefined") return false;

  const mobileUserAgent = /Android|iPhone|iPad|iPod|IEMobile|Mobile/i.test(navigator.userAgent);
  const hasTouch = navigator.maxTouchPoints > 1;
  const isTouchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return mobileUserAgent || hasTouch || isTouchMac;
}

type DbDefect = {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: number;
  status: string;
  photos: string[];
  campus_zones: { name: string }[] | { name: string } | null;
};

type Defect = {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: number;
  status: string;
  photos: string[];
  campus_zones: { name: string } | null;
};

function normalizeDefect(d: DbDefect): Defect {
  return {
    ...d,
    campus_zones: Array.isArray(d.campus_zones)
      ? (d.campus_zones[0] ?? null)
      : d.campus_zones,
  };
}

export default function ReportGenerator() {
  const router = useRouter();
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  const [title, setTitle] = useState("Q1 2026 INFRASTRUCTURE ASSESSMENT REPORT");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const updateDeviceState = () => {
      setIsMobile(isMobileLikeDevice());
    };

    updateDeviceState();
    window.addEventListener("resize", updateDeviceState);

    const initData = async () => {
      const supabase = createSupabaseClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
         setUserId(session.user.id);
         setAuthorName(session.user.user_metadata?.full_name || "Admin Auth");
      }

      // Default dates
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 3);
      setPeriodEnd(end.toISOString().split("T")[0]);
      setPeriodStart(start.toISOString().split("T")[0]);

      // Fetch 'assessed' & 'resolved' defects for the last 3 months
      const { data, error } = await supabase
        .from("defects")
        .select(`
          id, title, description, category, severity, status, photos, 
          campus_zones(name)
        `)
        .in("status", ["assessed", "resolved", "escalated"])
        .order("severity", { ascending: false });

      if (data && !error) {
        setDefects((data as DbDefect[]).map(normalizeDefect));
      }
      setLoading(false);
    };

    initData();

    return () => window.removeEventListener("resize", updateDeviceState);
  }, []);

  const saveReportToDatabase = async () => {
    if (!userId) {
       toast.error("You must be authenticated to publish a report.");
       return;
    }
    setSaving(true);
    const supabase = createSupabaseClient();
    
     const { data: insertedReport, error } = await supabase.from("reports").insert({
       title,
       period_start: periodStart,
       period_end: periodEnd,
       authored_by: userId,
       status: 'published',
       defects_included: defects.map(d => d.id)
     }).select("id").single();

    if (error) {
      toast.error("Failed to save report to database.");
      console.error(error);
    } else {
      await logActivityEvent(supabase, {
        eventType: "report_published",
        entityType: "report",
        entityId: insertedReport?.id ?? null,
        title: `Published report: ${title}`,
        actorId: userId,
        details: {
          periodStart,
          periodEnd,
          includedDefects: defects.length,
        },
        isRelevant: true,
      });

      toast.success("Report Master File saved successfully.");
      router.push("/dashboard/reports");
    }
    setSaving(false);
  };

  if (loading) {
     return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" size={32}/></div>;
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      <Breadcrumbs className="mb-8" />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-textDefault flex items-center gap-3">
          <FileText className="text-primary"/> Report Engine Studio
        </h1>
        <p className="text-text2 mt-2">
          Compile and generate official formatted PDF reports for the FUTA Works Department.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
         
         {/* Configuration Sidebar */}
         <div className="lg:col-span-1 space-y-6">
            <div className="bg-bg2 border border-soft rounded-xl p-6">
               <h2 className="text-sm font-bold text-textDefault uppercase font-mono mb-4 border-b border-soft pb-2">Document Settings</h2>
               
               <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text3 uppercase mb-1">Report Title</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-bg border border-soft rounded p-2 text-sm text-textDefault focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text3 uppercase mb-1">Period Start</label>
                    <input 
                      type="date" 
                      value={periodStart}
                      onChange={e => setPeriodStart(e.target.value)}
                      className="w-full bg-bg border border-soft rounded p-2 text-sm text-textDefault focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text3 uppercase mb-1">Period End</label>
                    <input 
                      type="date" 
                      value={periodEnd}
                      onChange={e => setPeriodEnd(e.target.value)}
                      className="w-full bg-bg border border-soft rounded p-2 text-sm text-textDefault focus:outline-none focus:border-primary"
                    />
                  </div>
               </div>

               <div className="mt-8 pt-6 border-t border-soft">
                  <div className="text-xs font-mono text-text3 mb-4">
                    Included Data: <strong className="text-textDefault">{defects.length} Extracted Anomalies</strong>
                  </div>

                  <div className="space-y-3">
                    <PDFDownloadLink
                      document={<ReportDocument title={title} periodStart={periodStart} periodEnd={periodEnd} authorName={authorName} defects={defects} />}
                      fileName={`IMAT_Report_${periodEnd}.pdf`}
                      className="w-full text-center px-4 py-3 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-bold text-sm rounded-lg border border-blue-500/30 transition-colors flex justify-center items-center gap-2"
                    >
                      {({ loading }) => (loading ? <span>Rendering Component...</span> : <><Download size={16}/> Download PDF File</>)}
                    </PDFDownloadLink>
                    
                    <button 
                      onClick={saveReportToDatabase}
                      disabled={saving}
                      className="w-full px-4 py-3 bg-primary hover:bg-blue-500 text-white font-bold text-sm rounded-lg transition-colors flex justify-center items-center gap-2 shadow-lg shadow-primary/20"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                      Publish to Masterlist
                    </button>
                  </div>
               </div>
            </div>
         </div>

         {/* PDF Live Preview Window */}
         <div className="lg:col-span-3 bg-bg2 border border-soft rounded-xl overflow-hidden shadow-2xl min-h-[420px] md:h-[800px] flex flex-col">
            <div className="p-3 bg-bg border-b border-soft flex items-center justify-between">
              <div className="text-xs font-mono text-text3 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div> Live Preview Engine
              </div>
            </div>

            {isMobile ? (
              <div className="flex-grow bg-bg flex items-center justify-center p-6 text-center">
                <div className="max-w-md space-y-4">
                  <div className="text-sm font-bold text-textDefault">Live preview is not reliable on mobile browsers.</div>
                  <p className="text-sm text-text2">Use the download button to open the generated PDF, or switch to desktop for inline preview.</p>
                  <PDFDownloadLink
                    document={<ReportDocument title={title} periodStart={periodStart} periodEnd={periodEnd} authorName={authorName} defects={defects} />}
                    fileName={`IMAT_Report_${periodEnd}.pdf`}
                    className="inline-flex w-full justify-center px-4 py-3 bg-primary hover:bg-blue-500 text-white font-bold text-sm rounded-lg transition-colors"
                  >
                    {({ loading }) => (loading ? <span>Preparing PDF...</span> : <span>Download PDF File</span>)}
                  </PDFDownloadLink>
                </div>
              </div>
            ) : (
              <div className="flex-grow bg-[#525659]">
                <PDFViewer width="100%" height="100%" className="border-none">
                  <ReportDocument 
                     title={title} 
                     periodStart={periodStart} 
                     periodEnd={periodEnd} 
                     authorName={authorName} 
                     defects={defects} 
                  />
                </PDFViewer>
              </div>
            )}
         </div>

      </div>
    </div>
  );
}

