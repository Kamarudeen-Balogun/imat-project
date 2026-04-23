"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react";
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
    <nav className="sticky top-0 z-50 border-b border-borderDark bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5 font-mono text-xl font-bold tracking-tight text-textDefault">
            <Image
              src="/images/imatlogo.png"
              alt="IMAT Logo"
              width={36}
              height={36}
              loading="eager"
              style={{ width: "36px", height: "36px" }}
              className="shrink-0 rounded-xl shadow-glow"
            />
            <span className="truncate bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent transition-all group-hover:shadow-glow">IMAT</span>
          </Link>
        </div>

        <div className="hidden items-center justify-center gap-1 md:flex">
          <Link href="/about" className="rounded-full px-4 py-2 text-sm font-semibold text-text2 transition-all hover:bg-primary/10 hover:text-primary hover:shadow-glow">About</Link>
          <Link href="/evidence" className="rounded-full px-4 py-2 text-sm font-semibold text-text2 transition-all hover:bg-primary/10 hover:text-primary hover:shadow-glow">Evidence</Link>
          <Link href="/newsroom" className="rounded-full px-4 py-2 text-sm font-semibold text-text2 transition-all hover:bg-primary/10 hover:text-primary hover:shadow-glow">Newsroom</Link>
          <Link href="/issues" className="rounded-full px-4 py-2 text-sm font-semibold text-text2 transition-all hover:bg-primary/10 hover:text-primary hover:shadow-glow">Tracker</Link>
        </div>

        <div className="hidden items-center justify-end gap-2 md:flex">

          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-xl border border-borderDark/50 bg-bg2/60 p-2.5 text-text2 transition-all hover:border-accent hover:text-accent hover:shadow-glow-accent"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}

          {isLoggedIn ? (
            <Link href="/dashboard" className="rounded-xl border-2 border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-all hover:border-primary hover:bg-primary/20 hover:shadow-glow">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-text2 transition-all hover:text-primary hover:bg-primary/5">
              Login
            </Link>
          )}

          <Link href="/report" className="rounded-xl border border-borderDark/60 bg-bg2/60 px-4 py-2 text-sm font-semibold text-textDefault transition-all hover:border-accent hover:text-accent hover:shadow-glow-accent">
            Report Issue
          </Link>

          <Link href="/apply" className="inline-flex items-center gap-2 rounded-xl border-2 border-primary bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:bg-accent hover:shadow-glow-accent">
            Apply to Join
            <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="flex items-center justify-end gap-2 md:hidden">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full border border-borderDark/70 bg-surface px-2.5 py-2 text-text3 transition-colors hover:text-textDefault"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg border border-borderDark/70 bg-surface px-2 py-2 text-textDefault transition-colors hover:bg-bg3"
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
              className="fixed inset-0 bg-black/80 backdrop-blur-lg md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              className="fixed inset-x-0 top-16 px-3 md:hidden"
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="bg-bg border border-borderDark max-h-[calc(100vh-5.25rem)] overflow-y-auto rounded-2xl p-4 shadow-2xl">

                <div className="grid grid-cols-1 gap-2 text-sm font-semibold">
                  <Link href="/about" className="block rounded-xl border border-borderDark/70 bg-surfaceStrong px-4 py-3 text-textDefault transition-colors hover:border-primary/60 hover:text-primary">About</Link>
                  <Link href="/evidence" className="block rounded-xl border border-borderDark/70 bg-surfaceStrong px-4 py-3 text-textDefault transition-colors hover:border-primary/60 hover:text-primary">Evidence Gallery</Link>
                  <Link href="/newsroom" className="block rounded-xl border border-borderDark/70 bg-surfaceStrong px-4 py-3 text-textDefault transition-colors hover:border-primary/60 hover:text-primary">Newsroom</Link>
                  <Link href="/issues" className="block rounded-xl border border-borderDark/70 bg-surfaceStrong px-4 py-3 text-textDefault transition-colors hover:border-primary/60 hover:text-primary">Issue Tracker</Link>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  {isLoggedIn ? (
                    <Link href="/dashboard" className="rounded-xl border border-primary/40 bg-primary/15 py-3 text-center text-sm font-bold text-primary transition-colors hover:bg-primary/20">
                      Dashboard
                    </Link>
                  ) : (
                    <Link href="/login" className="rounded-xl border border-borderDark py-3 text-center text-sm font-semibold text-textDefault transition-colors hover:border-primary/60 hover:text-primary">
                      Member Login
                    </Link>
                  )}

                  <Link href="/report" className="rounded-xl border border-borderDark py-3 text-center text-sm font-semibold text-textDefault transition-colors hover:border-borderLit">
                    Report Issue
                  </Link>

                  <Link href="/apply" className="rounded-xl border border-primary/40 bg-primary py-3 text-center text-sm font-bold text-bg shadow-lg shadow-primary/25 transition-colors hover:bg-sky-400">
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
