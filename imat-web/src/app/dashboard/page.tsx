"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { AlertTriangle, BookOpen, CheckCircle, Clock, FileText, Gauge, MapPin, Megaphone, Activity } from "lucide-react";
import Link from "next/link";
import { canEditContent } from "@/lib/access";
import { useSiteStats } from "@/hooks/useSiteStats";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export default function DashboardPage() {
  const [role, setRole] = useState("admin");
  const { stats, loading } = useSiteStats(15000);
  
  useEffect(() => {
    const fetchUserAndStats = async () => {
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data } = await supabase.from("users").select("role").eq("id", session.user.id).single();
        if (data) setRole(data.role);
      }
    };
    fetchUserAndStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Breadcrumbs className="mb-2" />
      
      <div className="rounded-lg border border-borderDark bg-asphalt p-5 text-white shadow-2xl sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-accent">
              <Gauge size={13} /> Internal Operations Console
            </div>
            <h1 className="text-2xl font-black text-white md:text-4xl">Infrastructure Control Board</h1>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-slate-300">
            Monitor active reports, move defects through assessment, and publish evidence-backed updates.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto md:overflow-visible">
      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 min-w-[360px] md:min-w-0">
        <div className="kpi-tile flex flex-col items-center rounded-lg p-3 text-center sm:p-4 md:p-6">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-md border border-danger/25 bg-danger/10 text-danger md:mb-4 md:h-12 md:w-12"><Clock size={16} className="md:hidden" /><Clock size={24} className="hidden md:block" /></div>
          <div className="text-2xl md:text-3xl font-bold text-textDefault mb-1">{loading ? "--" : stats.reported}</div>
          <div className="text-[10px] sm:text-xs md:text-sm text-text3 font-mono uppercase tracking-wider leading-tight">Defects Reported</div>
         </div>
        <div className="kpi-tile flex flex-col items-center rounded-lg p-3 text-center sm:p-4 md:p-6">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-md border border-warning/25 bg-warning/10 text-warning md:mb-4 md:h-12 md:w-12"><AlertTriangle size={16} className="md:hidden" /><AlertTriangle size={24} className="hidden md:block" /></div>
          <div className="text-2xl md:text-3xl font-bold text-textDefault mb-1">{loading ? "--" : stats.underAssessment}</div>
          <div className="text-[10px] sm:text-xs md:text-sm text-text3 font-mono uppercase tracking-wider leading-tight">Under Assessment</div>
         </div>
        <div className="kpi-tile flex flex-col items-center rounded-lg p-3 text-center sm:p-4 md:p-6">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-md border border-success/25 bg-success/10 text-success md:mb-4 md:h-12 md:w-12"><CheckCircle size={16} className="md:hidden" /><CheckCircle size={24} className="hidden md:block" /></div>
          <div className="text-2xl md:text-3xl font-bold text-textDefault mb-1">{loading ? "--" : stats.resolved}</div>
          <div className="text-[10px] sm:text-xs md:text-sm text-text3 font-mono uppercase tracking-wider leading-tight">Resolved Issues</div>
         </div>
      </div>
        </div>

      <div>
         <h2 className="mb-6 border-b border-soft pb-2 text-xl font-black text-textDefault">Quick Actions ({role.replace("_", " ")})</h2>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Action Cards that depend on role */}
            {['field_officer', 'admin', 'technical_officer'].includes(role) && (
              <Link href="/dashboard/defects/new" className="group ticket-card block rounded-lg p-6 transition-colors hover:border-accent">
                 <div className="flex items-center gap-3 mb-3 text-primary">
                    <MapPin size={20} />
                    <strong className="text-lg">Log New Field Assessment</strong>
                 </div>
                 <p className="text-sm text-text2 leading-relaxed">
                   Submit a comprehensive engineering assessment with photos, severity rating, and location data.
                 </p>
              </Link>
            )}

            {['documentation_officer', 'admin'].includes(role) && (
              <Link href="/dashboard/reports/new" className="group ticket-card block rounded-lg p-6 transition-colors hover:border-primary">
                 <div className="flex items-center gap-3 mb-3 text-primary">
                    <FileText size={20} />
                    <strong className="text-lg">Generate Report</strong>
                 </div>
                 <p className="text-sm text-text2 leading-relaxed">
                   Compile a PDF report of recent assessments using the Structural Health Rating algorithm.
                 </p>
              </Link>
            )}

            {['advocacy_officer', 'president', 'admin'].includes(role) && (
              <Link href="/dashboard/campaigns/new" className="group ticket-card block rounded-lg p-6 transition-colors hover:border-accent">
                 <div className="flex items-center gap-3 mb-3 text-accent">
                    <Megaphone size={20} />
                    <strong className="text-lg">Broadcast Campaign</strong>
                 </div>
                 <p className="text-sm text-text2 leading-relaxed">
                   Publish a public advocacy campaign regarding resolved infrastructure tasks.
                 </p>
              </Link>
            )}

              <Link href="/dashboard/wiki" className="group ticket-card block rounded-lg p-6 transition-colors hover:border-success">
                <div className="flex items-center gap-3 mb-3 text-success">
                  <BookOpen size={20} />
                  <strong className="text-lg">Knowledge Base</strong>
                </div>
                <p className="text-sm text-text2 leading-relaxed">
                  Read or maintain project runbooks, decisions, and operational notes.
                </p>
              </Link>


            {canEditContent(role) && (
              <Link href="/dashboard/news" className="group ticket-card block rounded-lg p-6 transition-colors hover:border-primary">
                 <div className="flex items-center gap-3 mb-3 text-primary">
                    <Megaphone size={20} />
                    <strong className="text-lg">Manage Newsroom</strong>
                 </div>
                 <p className="text-sm text-text2 leading-relaxed">
                   Update, publish, or remove broadcasts and keep notification feeds in sync.
                 </p>
              </Link>
            )}
              <Link href="/dashboard/activity" className="group ticket-card block rounded-lg p-6 transition-colors hover:border-warning">
                <div className="flex items-center gap-3 mb-3 text-warning">
                  <Activity size={20} />
                  <strong className="text-lg">Activity Timeline</strong>
                </div>
                <p className="text-sm text-text2 leading-relaxed">
                  Inspect the automated history of system actions across the platform.
                </p>
              </Link>

         </div>
      </div>

    </div>
  );
}

