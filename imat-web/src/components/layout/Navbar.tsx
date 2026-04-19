"use client";

import Link from "next/link";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

import Image from "next/image";
import imatLogo from "@/imat.png";
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
    
    // Check Auth Status for Dynamic Button
    const checkAuth = async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase.auth.getSession();
      if (data.session) setIsLoggedIn(true);
    };
    checkAuth();
  }, []);

  return (
    <nav className="border-b border-borderDark bg-bg/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <div className="flex items-center min-w-0">
          <Link href="/" className="font-mono text-xl font-bold tracking-tight text-textDefault flex items-center gap-2 min-w-0">
            <Image
              src={imatLogo}
              alt="IMAT Logo"
              width={32}
              height={32}
              style={{ width: "32px", height: "32px" }}
              className="rounded shrink-0"
            />
            <span className="text-accent">IMAT</span>
          </Link>
        </div>

        {/* Core Links */}
        <div className="hidden md:flex gap-6 items-center justify-center">
           <Link href="/about" className="text-text2 hover:text-textDefault transition-colors text-sm font-semibold tracking-wide">About</Link>
           <Link href="/evidence" className="text-text2 hover:text-textDefault transition-colors text-sm font-semibold tracking-wide">Evidence Gallery</Link>
           <Link href="/newsroom" className="text-text2 hover:text-textDefault transition-colors text-sm font-semibold tracking-wide">Newsroom</Link>
           <Link href="/issues" className="text-text2 hover:text-textDefault transition-colors text-sm font-semibold tracking-wide">Tracker</Link>
        </div>

        <div className="hidden md:flex items-center gap-3 justify-end">

          {mounted && (
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
              className="p-2 mr-2 text-text3 hover:text-textDefault transition-colors rounded-full hover:bg-bg2"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
          
          {isLoggedIn ? (
            <Link href="/dashboard" className="text-sm text-textDefault hover:text-primary px-4 py-2 font-semibold transition-colors bg-primary/10 rounded">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-textDefault hover:text-primary px-4 py-2 font-semibold transition-colors">
              Login
            </Link>
          )}

          <Link href="/report" className="text-sm border border-borderDark text-textDefault hover:border-text3 px-4 py-2 rounded transition-colors">
            Report Issue
          </Link>
          <Link href="/apply" className="text-sm bg-primary hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded transition-colors">
            Apply to Join
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-2 justify-end">
          {mounted && (
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
              className="p-2 text-text3 hover:text-textDefault transition-colors rounded-full hover:bg-bg2"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-textDefault p-2 rounded-lg border border-borderDark bg-bg2/80 hover:bg-bg3 transition-colors"
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
              className="md:hidden fixed inset-0 bg-slate-950/35 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              className="md:hidden fixed inset-x-0 top-16 px-3"
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="max-h-[calc(100vh-5.25rem)] overflow-y-auto rounded-2xl border border-borderDark/80 bg-bg2 shadow-2xl p-4">
                <div className="grid grid-cols-1 gap-2 text-sm font-semibold">
                  <Link href="/about" className="block rounded-xl border border-borderDark/70 bg-bg px-4 py-3 text-textDefault hover:border-primary/60 hover:text-primary transition-colors">About</Link>
                  <Link href="/evidence" className="block rounded-xl border border-borderDark/70 bg-bg px-4 py-3 text-textDefault hover:border-primary/60 hover:text-primary transition-colors">Evidence Gallery</Link>
                  <Link href="/newsroom" className="block rounded-xl border border-borderDark/70 bg-bg px-4 py-3 text-textDefault hover:border-primary/60 hover:text-primary transition-colors">Newsroom</Link>
                  <Link href="/issues" className="block rounded-xl border border-borderDark/70 bg-bg px-4 py-3 text-textDefault hover:border-primary/60 hover:text-primary transition-colors">Issue Tracker</Link>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  {isLoggedIn ? (
                    <Link href="/dashboard" className="rounded-xl text-center text-sm bg-primary/15 border border-primary/30 text-primary font-bold py-3 hover:bg-primary/20 transition-colors">
                      Dashboard
                    </Link>
                  ) : (
                    <Link href="/login" className="rounded-xl text-center text-sm border border-borderDark text-textDefault font-semibold py-3 hover:border-primary/60 hover:text-primary transition-colors">
                      Member Login
                    </Link>
                  )}

                  <Link href="/report" className="rounded-xl text-center text-sm border border-borderDark text-textDefault font-semibold py-3 hover:border-text3 transition-colors">
                    Report Issue
                  </Link>

                  <Link href="/apply" className="rounded-xl text-center text-sm bg-primary hover:bg-blue-500 text-white font-bold py-3 transition-colors shadow-lg shadow-primary/20">
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
