"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Map, BookOpen, LogOut, Loader2, FileText, BarChart2, Megaphone, Activity, Menu, X, User, Share2, Moon, Sun } from "lucide-react";
import Image from "next/image";
import optimizeCloudinaryUrl from "@/lib/cloudinary";
import { toast } from "react-hot-toast";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AnimatePresence, motion } from "framer-motion";
import { canEditContent, canEditEvidenceGallery, canManageSocialLinks } from "@/lib/access";
import { useTheme } from "@/components/ThemeProvider";

type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string | null;
};

async function waitForBrowserSession(supabase: ReturnType<typeof createSupabaseClient>) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      return session;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }

  return null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      const session = await waitForBrowserSession(supabase);
      if (!session) {
        if (!cancelled) {
          router.replace("/login");
        }
        return;
      }

      // Fetch member profile details using the auth ID
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (cancelled) return;

      if (data && !error) {
        setProfile(data);
      } else {
        // Fallback for new unlinked users during development
        setProfile({ id: session.user.id, email: session.user.email!, full_name: "Admin", role: "admin" });
      }
      setLoading(false);
    };
    fetchUser();

    return () => {
      cancelled = true;
    };
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

  const isActiveNavItem = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navItemClassName = (itemHref: string, baseClasses: string) => {
    const active = isActiveNavItem(itemHref);
    const activeClasses = active
      ? "bg-accent/12 text-accent ring-1 ring-accent/35"
      : baseClasses;

    return `flex items-center gap-3 rounded-md px-4 py-3 text-sm font-bold transition-colors ${activeClasses}`;
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, classes: "text-slate-300 hover:bg-white/5 hover:text-white" },
    { href: "/dashboard/defects", label: "Defect Masterlist", icon: Map, classes: "text-slate-300 hover:bg-white/5 hover:text-white" },
    { href: "/dashboard/reports", label: "Engineering Reports", icon: FileText, classes: "text-slate-300 hover:bg-white/5 hover:text-white" },
    { href: "/portal/analytics", label: "Analytics", icon: BarChart2, classes: "text-slate-300 hover:bg-white/5 hover:text-white" },
    ...(canEditContent(profile?.role) ? [{ href: "/dashboard/news", label: "Newsroom Manager", icon: Megaphone, classes: "text-slate-300 hover:bg-white/5 hover:text-white" }] : []),
    ...(canEditEvidenceGallery(profile?.role) ? [{ href: "/dashboard/evidence", label: "Evidence Gallery", icon: FileText, classes: "text-slate-300 hover:bg-white/5 hover:text-white" }] : []),
    ...(canManageSocialLinks(profile?.role) ? [{ href: "/dashboard/social-links", label: "Social Links", icon: Share2, classes: "text-slate-300 hover:bg-white/5 hover:text-white" }] : []),
    { href: "/dashboard/directory", label: "Member Directory", icon: Users, classes: "text-slate-300 hover:bg-white/5 hover:text-white" },
    { href: "/dashboard/profile", label: "My Profile", icon: User, classes: "text-slate-300 hover:bg-white/5 hover:text-white" },
    { href: "/dashboard/wiki", label: "Knowledge Base", icon: BookOpen, classes: "text-slate-300 hover:bg-white/5 hover:text-white" },
    { href: "/dashboard/activity", label: "Activity Timeline", icon: Activity, classes: "text-slate-300 hover:bg-white/5 hover:text-white" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <OfflineBanner />
      <aside className="hidden w-72 flex-col border-r border-white/10 bg-asphalt text-white md:flex">
         <div className="flex items-center gap-3 border-b border-white/10 p-6">
            <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/30 shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
              <Image
                src="/images/logo.png"
                alt="IMAT"
                width={32}
                height={32}
                loading="eager"
                style={{ width: "32px", height: "32px" }}
                className="rounded-xl object-contain"
              />
            </span>
            <div>
              <div className="font-bold tracking-tight text-white">IMAT Portal</div>
              <div className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">{profile?.role.replace("_", " ")}</div>
            </div>
         </div>
         <nav className="flex-grow space-y-2 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActiveNavItem(item.href) ? "page" : undefined}
                className={navItemClassName(item.href, item.classes)}
              >
                <item.icon size={18} /> {item.label}
              </Link>
            ))}
            
            <div className="px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">Field Operations</div>
            
            {['admin', 'field_officer', 'technical_officer'].includes(profile?.role || '') && (
              <Link href="/dashboard/defects/new" className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-bold text-warning transition-colors hover:bg-warning/10 hover:text-warning">
                 + New Assessment
               </Link>
            )}

            {['admin', 'advocacy_officer', 'president', 'vice_president'].includes(profile?.role || '') && (
               <Link href="/dashboard/campaigns/new" className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
                 <Megaphone size={18} /> Broadcast & Campaigns
               </Link>
            )}

            <div className="px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">Public Portal</div>

            <Link href="/issues" className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
              <Map size={18} /> Issue Tracker
            </Link>
            <Link href="/evidence" className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
              <FileText size={18} /> Evidence Gallery
            </Link>
            <Link href="/newsroom" className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
              <Megaphone size={18} /> Newsroom
            </Link>

         </nav>
         <div className="border-t border-white/10 bg-black/15 p-4 text-sm text-slate-400">
            <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-left font-medium transition-colors hover:bg-danger/10 hover:text-danger">
              <LogOut size={18} /> Sign Out
            </button>
         </div>
      </aside>

      <main className="flex-grow flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-2 border-b border-borderDark bg-surfaceStrong px-4 backdrop-blur-md sm:px-6 md:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMenuOpen((current) => !current)}
                className="rounded-md border border-soft bg-surface px-2 py-2 transition-colors hover:bg-bg3 md:hidden"
                aria-label="Toggle dashboard menu"
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <h1 className="truncate font-mono text-xs text-text3 sm:text-sm">Operations console / <strong className="text-textDefault">{profile?.full_name}</strong></h1>
            </div>
            <div className="flex items-center gap-3">
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="rounded-md border border-soft bg-surface px-2.5 py-2 text-text2 transition-colors hover:border-accent hover:text-accent"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              )}
              <Link href="/dashboard/profile" className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-soft overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 text-sm font-bold text-textDefault">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url && profile.avatar_url.includes('res.cloudinary.com') ? optimizeCloudinaryUrl(profile.avatar_url) : profile.avatar_url}
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
              <Link href="/" className="text-xs font-bold uppercase tracking-[0.12em] text-text2 transition-colors hover:text-accent">Public Site</Link>
            </div>
        </header>
        <AnimatePresence>
          {menuOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-20 bg-slate-950/50 md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMenuOpen(false)}
              />
              <motion.aside
                className="fixed left-0 top-16 z-30 h-[calc(100dvh-4rem)] w-80 max-w-[88vw] overflow-y-auto overscroll-contain border-r border-white/10 bg-asphalt p-4 pb-24 text-white shadow-2xl md:hidden"
                style={{ WebkitOverflowScrolling: "touch" }}
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
                      aria-current={isActiveNavItem(item.href) ? "page" : undefined}
                      className={navItemClassName(item.href, item.classes)}
                    >
                      <item.icon size={18} /> {item.label}
                    </Link>
                  ))}
                  {['admin', 'field_officer', 'technical_officer'].includes(profile?.role || '') && (
                    <Link href="/dashboard/defects/new" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-bold text-warning transition-colors hover:bg-warning/10 hover:text-warning">
                      + New Assessment
                    </Link>
                  )}
                  {['admin', 'advocacy_officer', 'president', 'vice_president'].includes(profile?.role || '') && (
                    <Link href="/dashboard/campaigns/new" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
                      <Megaphone size={18} /> Broadcast & Campaigns
                    </Link>
                  )}
                  <div className="px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">Public Portal</div>
                  <Link href="/issues" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
                    <Map size={18} /> Issue Tracker
                  </Link>
                  <Link href="/evidence" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
                    <FileText size={18} /> Evidence Gallery
                  </Link>
                  <Link href="/newsroom" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
                    <Megaphone size={18} /> Newsroom
                  </Link>
                  <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-medium text-slate-300 transition-colors hover:bg-danger/10 hover:text-danger">
                    <LogOut size={18} /> Sign Out
                  </button>
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
        <div className="flex-grow overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

