"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { FileText, Download, Loader2 } from "lucide-react";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { ReportDocument } from "@/components/pdf/ReportDocument";
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

type ReportConfig = {
  title: string;
  period_start: string;
  period_end: string;
  authored_by: { full_name: string } | null;
};

export default function ExistingReportViewer({ reportId }: { reportId: string }) {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateDeviceState = () => {
      setIsMobile(isMobileLikeDevice());
    };

    updateDeviceState();
    window.addEventListener("resize", updateDeviceState);

    const fetchReportData = async () => {
      const supabase = createSupabaseClient();
      
      const { data: report, error } = await supabase
        .from("reports")
        .select(`
          *,
          authored_by:users!reports_authored_by_fkey(full_name)
        `)
        .eq("id", reportId)
        .single();

      if (report && !error) {
         setReportConfig(report);
         
         if (report.defects_included && report.defects_included.length > 0) {
            const { data: dData } = await supabase
              .from("defects")
              .select(`
                id, title, description, category, severity, status, photos, 
                campus_zones(name)
              `)
              .in("id", report.defects_included)
              .order("severity", { ascending: false });
              
            setDefects((dData as DbDefect[] || []).map(normalizeDefect));
         }
      }
      setLoading(false);
    };

    fetchReportData();
    return () => window.removeEventListener("resize", updateDeviceState);
  }, [reportId]);

  if (loading) {
     return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" size={32}/></div>;
  }

  if (!reportConfig) {
     return <div className="p-12 text-center text-danger font-mono border border-danger/20 rounded-xl">Report Not Found.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
      <Breadcrumbs className="mb-8" />
      
      <div className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-textDefault flex items-center gap-3">
            <FileText className="text-primary"/> {reportConfig.title}
          </h1>
          <p className="text-text2 mt-2 font-mono text-sm uppercase">
            {reportConfig.period_start} TO {reportConfig.period_end} • BY {reportConfig.authored_by?.full_name || "SYSTEM"}
          </p>
        </div>

        <PDFDownloadLink
          document={<ReportDocument 
             title={reportConfig.title} 
             periodStart={reportConfig.period_start} 
             periodEnd={reportConfig.period_end} 
             authorName={reportConfig.authored_by?.full_name || "IMAT"} 
             defects={defects} 
          />}
          fileName={`IMAT_Report_${reportConfig.period_end}.pdf`}
          className="px-6 py-3 bg-primary hover:bg-blue-500 text-white font-bold text-sm rounded-lg transition-colors flex justify-center items-center gap-2 shadow-lg shadow-primary/20"
        >
          {({ loading }) => (loading ? <span>Rendering...</span> : <><Download size={16}/> Download PDF</>)}
        </PDFDownloadLink>
      </div>

      <div className="bg-bg2 border border-soft rounded-xl overflow-hidden shadow-2xl min-h-[420px] md:h-[800px] flex flex-col">
         <div className="p-3 bg-bg border-b border-soft flex items-center justify-between">
           <div className="text-xs font-mono text-text3">Read-only Archive Viewer</div>
         </div>

         {isMobile ? (
           <div className="flex-grow bg-bg flex items-center justify-center p-6 text-center">
             <div className="max-w-md space-y-4">
               <div className="text-sm font-bold text-textDefault">Inline preview is disabled on mobile.</div>
               <p className="text-sm text-text2">Open the report on desktop for preview, or download the PDF below.</p>
               <PDFDownloadLink
                 document={<ReportDocument 
                    title={reportConfig.title} 
                    periodStart={reportConfig.period_start} 
                    periodEnd={reportConfig.period_end} 
                    authorName={reportConfig.authored_by?.full_name || "IMAT"} 
                    defects={defects} 
                 />}
                 fileName={`IMAT_Report_${reportConfig.period_end}.pdf`}
                 className="inline-flex w-full justify-center px-4 py-3 bg-primary hover:bg-blue-500 text-white font-bold text-sm rounded-lg transition-colors"
               >
                 {({ loading }) => (loading ? <span>Preparing PDF...</span> : <span>Download PDF</span>)}
               </PDFDownloadLink>
             </div>
           </div>
         ) : (
           <div className="flex-grow bg-[#525659]">
             <PDFViewer width="100%" height="100%" className="border-none">
               <ReportDocument 
                  title={reportConfig.title} 
                  periodStart={reportConfig.period_start} 
                  periodEnd={reportConfig.period_end} 
                  authorName={reportConfig.authored_by?.full_name || "IMAT"} 
                  defects={defects} 
               />
             </PDFViewer>
           </div>
         )}
      </div>
    </div>
  );
}
