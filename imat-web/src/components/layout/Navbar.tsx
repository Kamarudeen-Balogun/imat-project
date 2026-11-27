"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Gauge, Menu, Moon, Sun, X } from "lucide-react";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

import Image from "next/image";
import { useTheme } from "@/components/ThemeProvider";
import { createSupabaseClient } from "@/lib/supabase/client";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    setMounted(true);

    const checkAuth = async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase.auth.getSession();
      if (data.session) setIsLoggedIn(true);
    };
    checkAuth();
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-borderDark bg-surfaceStrong/95 backdrop-blur-xl">
      <div className="mx-auto grid h-[4.5rem] max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center">
          <Link href="/" className="group flex min-w-0 items-center gap-3 font-mono text-xl font-bold tracking-tight text-textDefault">
              <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-borderLit/40 bg-asphalt shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
                <Image
                  src="/images/logo.png"
                  alt="IMAT Logo"
                  width={36}
                  height={36}
                  loading="eager"
                  style={{ width: "36px", height: "36px" }}
                  priority
                  className="shrink-0 rounded-xl object-contain"
                />
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block text-sm leading-none tracking-[0.18em]">IMAT</span>
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.22em] text-text3">Infrastructure Ops</span>
              </span>
            </Link>
        </div>

        <div className="hidden items-center justify-center gap-1 lg:flex">
          <Link href="/issues" className="rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-text2 transition-all hover:bg-bg3 hover:text-textDefault">Tracker</Link>
          <Link href="/evidence" className="rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-text2 transition-all hover:bg-bg3 hover:text-textDefault">Evidence</Link>
          <Link href="/newsroom" className="rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-text2 transition-all hover:bg-bg3 hover:text-textDefault">Newsroom</Link>
          <Link href="/members" className="rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-text2 transition-all hover:bg-bg3 hover:text-textDefault">Members</Link>
          <Link href="/about" className="rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-text2 transition-all hover:bg-bg3 hover:text-textDefault">About</Link>
        </div>

        <div className="hidden items-center justify-end gap-2 lg:flex">

          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-md border border-borderDark bg-bg p-2.5 text-text2 transition-all hover:border-accent hover:text-accent"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}

          {isLoggedIn ? (
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-all hover:border-primary hover:bg-primary/15">
              <Gauge size={15} />
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="rounded-md px-4 py-2 text-sm font-semibold text-text2 transition-all hover:bg-bg3 hover:text-textDefault">
              Login
            </Link>
          )}

          <Link href="/report" className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-4 py-2 text-sm font-black text-white transition-all hover:bg-accent2">
            <AlertTriangle size={15} />
            Report Issue
          </Link>

          <Link href="/apply" className="inline-flex items-center gap-2 rounded-md border border-borderDark bg-bg px-4 py-2 text-sm font-bold text-textDefault transition-all hover:border-primary hover:text-primary">
            Apply to Join
            <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="flex items-center justify-end gap-2 lg:hidden">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-md border border-borderDark bg-surface px-2.5 py-2 text-text3 transition-colors hover:text-textDefault"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-md border border-borderDark bg-surface px-2 py-2 text-textDefault transition-colors hover:bg-bg3"
            aria-expanded={isOpen}
            aria-label="Toggle mobile menu"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
             <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              className="fixed inset-x-0 top-[4.5rem] px-3 md:hidden"
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="max-h-[calc(100vh-5.25rem)] overflow-y-auto rounded-lg border border-borderDark bg-surfaceStrong p-4 shadow-2xl">

                <div className="grid grid-cols-1 gap-2 text-sm font-semibold">
                  <Link href="/issues" className="block rounded-md border border-borderDark bg-bg px-4 py-3 text-textDefault transition-colors hover:border-primary/60 hover:text-primary">Issue Tracker</Link>
                  <Link href="/evidence" className="block rounded-md border border-borderDark bg-bg px-4 py-3 text-textDefault transition-colors hover:border-primary/60 hover:text-primary">Evidence Gallery</Link>
                  <Link href="/newsroom" className="block rounded-md border border-borderDark bg-bg px-4 py-3 text-textDefault transition-colors hover:border-primary/60 hover:text-primary">Newsroom</Link>
                  <Link href="/members" className="block rounded-md border border-borderDark bg-bg px-4 py-3 text-textDefault transition-colors hover:border-primary/60 hover:text-primary">Members</Link>
                  <Link href="/about" className="block rounded-md border border-borderDark bg-bg px-4 py-3 text-textDefault transition-colors hover:border-primary/60 hover:text-primary">About</Link>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  {isLoggedIn ? (
                    <Link href="/dashboard" className="rounded-md border border-primary/40 bg-primary/15 py-3 text-center text-sm font-bold text-primary transition-colors hover:bg-primary/20">
                      Dashboard
                    </Link>
                  ) : (
                    <Link href="/login" className="rounded-md border border-borderDark py-3 text-center text-sm font-semibold text-textDefault transition-colors hover:border-primary/60 hover:text-primary">
                      Member Login
                    </Link>
                  )}

                  <Link href="/report" className="rounded-md border border-accent bg-accent py-3 text-center text-sm font-black text-white transition-colors hover:bg-accent2">
                    Report Issue
                  </Link>

                  <Link href="/apply" className="rounded-md border border-borderDark bg-bg py-3 text-center text-sm font-bold text-textDefault transition-colors hover:border-primary hover:text-primary">
                    Apply to Join
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
