"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Gauge, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";
import { createSupabaseClient } from "@/lib/supabase/client";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  const navLink = (href: string) =>
    `rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-all ${
      pathname === href ? "bg-bg3 text-textDefault" : "text-text2 hover:bg-bg3 hover:text-textDefault"
    }`;

  const mobileNavLink = (href: string) =>
    `block rounded-md border px-4 py-3 transition-colors ${
      pathname === href
        ? "border-primary/60 bg-primary/10 font-bold text-primary"
        : "border-borderDark bg-bg text-textDefault hover:border-primary/60 hover:text-primary"
    }`;

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
    const checkAuth = async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase.auth.getSession();
      if (data.session) setIsLoggedIn(true);
    };
    checkAuth();
  }, []);

  return (
    <>
    <nav className="sticky top-0 z-50 border-b border-borderDark bg-surfaceStrong/95 backdrop-blur-xl">
      <div className="mx-auto grid h-[4.5rem] max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center">
          <Link href="/" className="group flex min-w-0 items-center gap-3 font-mono text-xl font-bold tracking-tight text-textDefault">
              <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-borderLit/40 bg-asphalt">
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
          <Link href="/" className={navLink("/")}>Home</Link>
          <Link href="/issues" className={navLink("/issues")}>Tracker</Link>
          <Link href="/evidence" className={navLink("/evidence")}>Evidence</Link>
          <Link href="/newsroom" className={navLink("/newsroom")}>Newsroom</Link>
          <Link href="/members" className={navLink("/members")}>Members</Link>
          <Link href="/about" className={navLink("/about")}>About</Link>
        </div>

        <div className="hidden items-center justify-end gap-2 lg:flex">
          <ThemeToggle />

          {isLoggedIn ? (
            <Link href="/dashboard" className="btn-primary btn-sm">
              <Gauge size={15} />
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="btn-ghost btn-sm">
              Login
            </Link>
          )}

          <Link href="/report" className="btn-accent btn-sm">
            <AlertTriangle size={15} />
            Report Issue
          </Link>

          <Link href="/apply" className="btn-outline btn-sm">
            Apply to Join
            <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="flex items-center justify-end gap-2 lg:hidden">
          <ThemeToggle compact />

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
    </nav>

      {/* The mobile menu lives outside the sticky nav: the nav's
          backdrop-blur creates a containing block, so a fixed overlay
          rendered inside it would only cover the header strip instead
          of the whole page. The panel is a solid background so page
          text can never bleed through it. */}
      <AnimatePresence>
        {isOpen && (
          <>
             <motion.div
              className="fixed inset-0 z-40 bg-black/80 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              className="fixed inset-x-0 top-[4.5rem] z-50 px-3 md:hidden"
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="max-h-[calc(100vh-5.25rem)] overflow-y-auto rounded-lg border border-borderDark bg-bg p-4 shadow-lg">

                <div className="grid grid-cols-1 gap-2 text-sm font-semibold">
                  <Link href="/" className={mobileNavLink("/")}>Home</Link>
                  <Link href="/issues" className={mobileNavLink("/issues")}>Issue Tracker</Link>
                  <Link href="/evidence" className={mobileNavLink("/evidence")}>Evidence Gallery</Link>
                  <Link href="/newsroom" className={mobileNavLink("/newsroom")}>Newsroom</Link>
                  <Link href="/members" className={mobileNavLink("/members")}>Members</Link>
                  <Link href="/about" className={mobileNavLink("/about")}>About</Link>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  {isLoggedIn ? (
                    <Link href="/dashboard" className="btn-primary w-full py-3">
                      Dashboard
                    </Link>
                  ) : (
                    <Link href="/login" className="btn-outline w-full py-3">
                      Member Login
                    </Link>
                  )}

                  <Link href="/report" className="btn-accent w-full py-3">
                    Report Issue
                  </Link>

                  <Link href="/apply" className="btn-outline w-full py-3">
                    Apply to Join
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
