"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Map, BookOpen, LogOut, Loader2, FileText, BarChart2, Megaphone, Activity, Menu, X, User } from "lucide-react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AnimatePresence, motion } from "framer-motion";
import { canEditContent, canEditEvidenceGallery } from "@/lib/access";

type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

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

  const initials = (profile?.full_name || profile?.email || "M").slice(0, 1).toUpperCase();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, classes: "bg-primary/10 text-primary font-bold" },
    { href: "/dashboard/defects", label: "Defect Masterlist", icon: Map, classes: "text-text2 hover:text-textDefault hover:bg-bg3" },
    { href: "/dashboard/reports", label: "Engineering Reports", icon: FileText, classes: "text-text2 hover:text-textDefault hover:bg-bg3" },
    { href: "/portal/analytics", label: "Analytics", icon: BarChart2, classes: "text-text2 hover:text-textDefault hover:bg-bg3" },
    ...(canEditContent(profile?.role) ? [{ href: "/dashboard/news", label: "Newsroom Manager", icon: Megaphone, classes: "text-text2 hover:text-textDefault hover:bg-bg3" }] : []),
    ...(canEditEvidenceGallery(profile?.role) ? [{ href: "/dashboard/evidence", label: "Evidence Gallery", icon: FileText, classes: "text-text2 hover:text-textDefault hover:bg-bg3" }] : []),
    { href: "/dashboard/directory", label: "Member Directory", icon: Users, classes: "text-text2 hover:text-textDefault hover:bg-bg3" },
    { href: "/dashboard/profile", label: "My Profile", icon: User, classes: "text-text2 hover:text-textDefault hover:bg-bg3" },
    { href: "/dashboard/wiki", label: "Knowledge Base", icon: BookOpen, classes: "text-text2 hover:text-textDefault hover:bg-bg3" },
    { href: "/dashboard/activity", label: "Activity Timeline", icon: Activity, classes: "text-text2 hover:text-textDefault hover:bg-bg3" },
  ];

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      <OfflineBanner />
      <aside className="hidden md:flex w-64 bg-bg2 border-r border-borderDark flex-col">
         <div className="p-6 border-b border-borderDark flex items-center gap-3">
            <Image
              src="/imatlogo.png"
              alt="IMAT"
              width={32}
              height={32}
              style={{ width: "32px", height: "32px" }}
              className="rounded"
            />
            <div>
              <div className="font-bold text-textDefault tracking-tight">IMAT Portal</div>
              <div className="text-[10px] text-text3 font-mono uppercase truncate">{profile?.role.replace("_", " ")}</div>
            </div>
         </div>
         <nav className="flex-grow p-4 space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${item.classes}`}>
                <item.icon size={18} /> {item.label}
              </Link>
            ))}
            
            <div className="pt-2 pb-1 px-4 text-[10px] font-mono text-text3 uppercase tracking-wider">Field Operations</div>
            
            {['admin', 'field_officer', 'technical_officer'].includes(profile?.role || '') && (
               <Link href="/dashboard/defects/new" className="flex items-center gap-3 px-4 py-3 text-warning hover:text-warning hover:bg-warning/10 rounded-lg font-bold text-sm transition-colors">
                 + New Assessment
               </Link>
            )}

            {['admin', 'advocacy_officer', 'president', 'vice_president'].includes(profile?.role || '') && (
               <Link href="/dashboard/campaigns/new" className="flex items-center gap-3 px-4 py-3 text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 rounded-lg font-medium text-sm transition-colors">
                 <Megaphone size={18} /> Broadcast & Campaigns
               </Link>
            )}

         </nav>
         <div className="p-4 border-t border-borderDark bg-bg2 text-sm text-text3">
            <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-left hover:text-danger hover:bg-dangerDim rounded-lg font-medium transition-colors">
              <LogOut size={18} /> Sign Out
            </button>
         </div>
      </aside>

      <main className="flex-grow flex flex-col min-h-screen">
        <header className="h-16 border-b border-borderDark bg-bg2/70 backdrop-blur-md sticky top-0 z-10 flex items-center px-4 sm:px-6 md:px-8 justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMenuOpen((current) => !current)}
                className="md:hidden p-2 rounded-lg border border-borderDark bg-bg hover:bg-bg3 transition-colors"
                aria-label="Toggle dashboard menu"
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <h1 className="text-xs sm:text-sm font-mono text-text3 truncate">Welcome back, <strong className="text-textDefault">{profile?.full_name}</strong></h1>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/profile" className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-borderDark overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 text-sm font-bold text-textDefault">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile?.full_name || "Profile"}
                    width={36}
                    height={36}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </Link>
              <Link href="/" className="text-xs text-text2 hover:text-primary transition-colors underline">View Public Site</Link>
            </div>
        </header>
        <AnimatePresence>
          {menuOpen && (
            <>
              <motion.div
                className="md:hidden fixed inset-0 bg-slate-950/40 z-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMenuOpen(false)}
              />
              <motion.aside
                className="md:hidden fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-80 max-w-[88vw] bg-bg2 border-r border-borderDark p-4 overflow-y-auto"
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
              >
                <nav className="space-y-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${item.classes}`}
                    >
                      <item.icon size={18} /> {item.label}
                    </Link>
                  ))}
                  {['admin', 'field_officer', 'technical_officer'].includes(profile?.role || '') && (
                    <Link href="/dashboard/defects/new" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-warning hover:text-warning hover:bg-warning/10 rounded-lg font-bold text-sm transition-colors">
                      + New Assessment
                    </Link>
                  )}
                  {['admin', 'advocacy_officer', 'president', 'vice_president'].includes(profile?.role || '') && (
                    <Link href="/dashboard/campaigns/new" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 rounded-lg font-medium text-sm transition-colors">
                      <Megaphone size={18} /> Broadcast & Campaigns
                    </Link>
                  )}
                  <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-left hover:text-danger hover:bg-dangerDim rounded-lg font-medium text-sm transition-colors text-text2">
                    <LogOut size={18} /> Sign Out
                  </button>
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
        <div className="flex-grow p-4 md:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
