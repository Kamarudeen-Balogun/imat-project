"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Map, BookOpen, LogOut, Loader2, FileText, BarChart2 } from "lucide-react";
import Image from "next/image";
import imatLogo from "@/imat.png";
import { toast } from "react-hot-toast";
import { OfflineBanner } from "@/components/OfflineBanner";

type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: string;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Fetch member profile details using the auth ID
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (data && !error) {
        setProfile(data);
      } else {
        // Fallback for new unlinked users during development
        setProfile({ id: session.user.id, email: session.user.email!, full_name: "Admin", role: "admin" });
      }
      setLoading(false);
    };
    fetchUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      <OfflineBanner />
      <aside className="w-full md:w-64 bg-bg2 border-b md:border-b-0 md:border-r border-borderDark flex flex-col">
         <div className="p-6 border-b border-borderDark flex items-center gap-3">
            <Image src={imatLogo} alt="IMAT" width={32} height={32} className="rounded" />
            <div>
              <div className="font-bold text-textDefault tracking-tight">IMAT Portal</div>
              <div className="text-[10px] text-text3 font-mono uppercase truncate">{profile?.role.replace("_", " ")}</div>
            </div>
         </div>
         <nav className="flex-grow p-4 space-y-2">
            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-lg font-bold text-sm">
              <LayoutDashboard size={18} /> Dashboard
            </Link>
            
            <div className="pt-2 pb-1 px-4 text-[10px] font-mono text-text3 uppercase tracking-wider">Field Operations</div>
            <Link href="/dashboard/defects" className="flex items-center gap-3 px-4 py-3 text-text2 hover:text-textDefault hover:bg-bg3 rounded-lg font-medium text-sm transition-colors">
              <Map size={18} /> Defect Masterlist
            </Link>
            <Link href="/dashboard/reports" className="flex items-center gap-3 px-4 py-3 text-text2 hover:text-textDefault hover:bg-bg3 rounded-lg font-medium text-sm transition-colors">
              <FileText size={18} /> Engineering Reports
            </Link>
            
            {['admin', 'field_officer', 'technical_officer'].includes(profile?.role || '') && (
               <Link href="/dashboard/defects/new" className="flex items-center gap-3 px-4 py-3 text-warning hover:text-warning hover:bg-warning/10 rounded-lg font-bold text-sm transition-colors">
                 + New Assessment
               </Link>
            )}

            <div className="pt-4 pb-1 px-4 text-[10px] font-mono text-text3 uppercase tracking-wider">Intelligence</div>
            <Link href="/portal/analytics" className="flex items-center gap-3 px-4 py-3 text-text2 hover:text-textDefault hover:bg-bg3 rounded-lg font-medium text-sm transition-colors">
              <BarChart2 size={18} /> Analytics
            </Link>
            <Link href="/dashboard/directory" className="flex items-center gap-3 px-4 py-3 text-text2 hover:text-textDefault hover:bg-bg3 rounded-lg font-medium text-sm transition-colors">
              <Users size={18} /> Member Directory
            </Link>
            <Link href="/dashboard/wiki" className="flex items-center gap-3 px-4 py-3 text-text2 hover:text-textDefault hover:bg-bg3 rounded-lg font-medium text-sm transition-colors">
              <BookOpen size={18} /> Knowledge Base
            </Link>
         </nav>
         <div className="p-4 border-t border-borderDark bg-bg2 text-sm text-text3">
            <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-left hover:text-danger hover:bg-dangerDim rounded-lg font-medium transition-colors">
              <LogOut size={18} /> Sign Out
            </button>
         </div>
      </aside>

      <main className="flex-grow flex flex-col min-h-screen">
        <header className="h-16 border-b border-borderDark bg-bg2/50 backdrop-blur-md sticky top-0 z-10 flex items-center px-8 justify-between">
            <h1 className="text-sm font-mono text-text3">Welcome back, <strong className="text-textDefault">{profile?.full_name}</strong></h1>
            <Link href="/" className="text-xs text-text2 hover:text-primary transition-colors underline">View Public Site</Link>
        </header>
        <div className="flex-grow p-4 md:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
