"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { AlertTriangle, Clock, MapPin, CheckCircle, FileText, Megaphone, BookOpen, Activity } from "lucide-react";
import Link from "next/link";
import { canEditContent } from "@/lib/access";

export default function DashboardPage() {
  const [role, setRole] = useState("admin");
  const [stats, setStats] = useState({ reported: 0, assessed: 0, resolved: 0 });
  
  useEffect(() => {
    const fetchUserAndStats = async () => {
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data } = await supabase.from("users").select("role").eq("id", session.user.id).single();
        if (data) setRole(data.role);
      }

      // Fetch global simple stats
      const { data: defects } = await supabase.from("defects").select("status");
      if (defects) {
        let r = 0, a = 0, res = 0;
        defects.forEach(d => {
          if (d.status === "reported") r++;
          if (d.status === "assessed" || d.status === "escalated" || d.status === "acknowledged_by_works") a++;
          if (d.status === "resolved") res++;
        });
        setStats({ reported: r, assessed: a, resolved: res });
      }
    };
    fetchUserAndStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* GLOBAL STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-bg2 border border-borderDark rounded-xl p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-4"><Clock size={24}/></div>
            <div className="text-3xl font-bold text-textDefault mb-1">{stats.reported}</div>
            <div className="text-sm text-text3 font-mono uppercase tracking-wider">New Reports</div>
         </div>
         <div className="bg-bg2 border border-borderDark rounded-xl p-6 flex flex-col items-center text-center border-b-2 border-b-warning">
            <div className="w-12 h-12 bg-warning/10 text-warning rounded-full flex items-center justify-center mb-4"><AlertTriangle size={24}/></div>
            <div className="text-3xl font-bold text-textDefault mb-1">{stats.assessed}</div>
            <div className="text-sm text-text3 font-mono uppercase tracking-wider">Under Assessment</div>
         </div>
         <div className="bg-bg2 border border-borderDark rounded-xl p-6 flex flex-col items-center text-center border-b-2 border-b-success">
            <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center mb-4"><CheckCircle size={24}/></div>
            <div className="text-3xl font-bold text-textDefault mb-1">{stats.resolved}</div>
            <div className="text-sm text-text3 font-mono uppercase tracking-wider">Resolved Issues</div>
         </div>
      </div>

      <div>
         <h2 className="text-xl font-bold text-textDefault mb-6 border-b border-borderDark pb-2">Quick Actions ({role.replace("_", " ")})</h2>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Action Cards that depend on role */}
            {['field_officer', 'admin', 'technical_officer'].includes(role) && (
              <Link href="/dashboard/defects/new" className="group block bg-bg border border-borderDark hover:border-primary rounded-xl p-6 transition-colors shadow-lg">
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
              <Link href="/dashboard/reports/new" className="group block bg-bg border border-borderDark hover:border-blue-400 rounded-xl p-6 transition-colors shadow-lg">
                 <div className="flex items-center gap-3 mb-3 text-blue-400">
                    <FileText size={20} />
                    <strong className="text-lg">Generate Report</strong>
                 </div>
                 <p className="text-sm text-text2 leading-relaxed">
                   Compile a PDF report of recent assessments using the Structural Health Rating algorithm.
                 </p>
              </Link>
            )}

            {['advocacy_officer', 'president', 'admin'].includes(role) && (
              <Link href="/dashboard/campaigns/new" className="group block bg-bg border border-borderDark hover:border-purple-400 rounded-xl p-6 transition-colors shadow-lg">
                 <div className="flex items-center gap-3 mb-3 text-purple-400">
                    <Megaphone size={20} />
                    <strong className="text-lg">Broadcast Campaign</strong>
                 </div>
                 <p className="text-sm text-text2 leading-relaxed">
                   Publish a public advocacy campaign regarding resolved infrastructure tasks.
                 </p>
              </Link>
            )}

              <Link href="/dashboard/wiki" className="group block bg-bg border border-borderDark hover:border-green-400 rounded-xl p-6 transition-colors shadow-lg">
                <div className="flex items-center gap-3 mb-3 text-green-400">
                  <BookOpen size={20} />
                  <strong className="text-lg">Knowledge Base</strong>
                </div>
                <p className="text-sm text-text2 leading-relaxed">
                  Read or maintain project runbooks, decisions, and operational notes.
                </p>
              </Link>


            {canEditContent(role) && (
              <Link href="/dashboard/news" className="group block bg-bg border border-borderDark hover:border-primary rounded-xl p-6 transition-colors shadow-lg">
                 <div className="flex items-center gap-3 mb-3 text-primary">
                    <Megaphone size={20} />
                    <strong className="text-lg">Manage Newsroom</strong>
                 </div>
                 <p className="text-sm text-text2 leading-relaxed">
                   Update, publish, or remove broadcasts and keep notification feeds in sync.
                 </p>
              </Link>
            )}
              <Link href="/dashboard/activity" className="group block bg-bg border border-borderDark hover:border-amber-400 rounded-xl p-6 transition-colors shadow-lg">
                <div className="flex items-center gap-3 mb-3 text-amber-400">
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
