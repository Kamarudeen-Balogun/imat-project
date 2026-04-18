"use client";

import Link from "next/link";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

import Image from "next/image";
import imatLogo from "@/imat.png";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check Auth Status for Dynamic Button
    const checkAuth = async () => {
      const { createSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = createSupabaseClient();
      const { data } = await supabase.auth.getSession();
      if (data.session) setIsLoggedIn(true);
    };
    checkAuth();
  }, []);

  return (
    <nav className="border-b border-borderDark bg-bg/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-mono text-xl font-bold tracking-tight text-textDefault flex items-center gap-2">
            <Image src={imatLogo} alt="IMAT Logo" width={32} height={32} className="rounded" />
            <span className="text-accent">IMAT</span>
            <span className="text-sm font-sans font-normal text-text2 hidden sm:inline-block border-l border-borderDark pl-2 border-dashed">Infrastructure Maintenance Awareness Team</span>
          </Link>

          {/* Core Links */}
          <div className="hidden md:flex gap-6 items-center border-l border-borderDark pl-6 ml-2">
             <Link href="/about" className="text-text2 hover:text-textDefault transition-colors text-sm font-semibold tracking-wide">About</Link>
             <Link href="/evidence" className="text-text2 hover:text-textDefault transition-colors text-sm font-semibold tracking-wide">Evidence Gallery</Link>
             <Link href="/issues" className="text-text2 hover:text-textDefault transition-colors text-sm font-semibold tracking-wide">Tracker</Link>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
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

        <div className="md:hidden flex items-center gap-2">
          {mounted && (
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
              className="p-2 text-text3 hover:text-textDefault transition-colors rounded-full hover:bg-bg2"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}

          <button onClick={() => setIsOpen(!isOpen)} className="text-textDefault p-2">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-bg border-b border-borderDark p-6 flex flex-col gap-4 text-sm font-medium shadow-xl absolute w-full max-h-[80vh] overflow-y-auto">
          <Link href="/about" onClick={() => setIsOpen(false)} className="block text-textDefault py-2 border-b border-borderDark/50">About</Link>
          <Link href="/evidence" onClick={() => setIsOpen(false)} className="block text-textDefault py-2 border-b border-borderDark/50">Evidence Gallery</Link>
          <Link href="/newsroom" onClick={() => setIsOpen(false)} className="block text-textDefault py-2 border-b border-borderDark/50">Newsroom</Link>
          <Link href="/issues" onClick={() => setIsOpen(false)} className="block text-textDefault py-2 border-b border-borderDark/50">Issue Tracker</Link>
          <div className="pt-4 flex flex-col gap-3">
             {isLoggedIn ? (
               <Link href="/dashboard" onClick={() => setIsOpen(false)} className="text-center text-sm text-primary bg-primary/10 font-semibold py-2 rounded transition-colors">
                 Backend Dashboard
               </Link>
             ) : (
               <Link href="/login" onClick={() => setIsOpen(false)} className="text-center text-sm text-textDefault hover:text-primary font-semibold py-2 transition-colors">
                 Member Login
               </Link>
             )}
             <Link href="/report" onClick={() => setIsOpen(false)} className="text-center text-sm border border-borderDark text-textDefault hover:border-text3 px-4 py-3 rounded transition-colors">
              Report Issue
            </Link>
            <Link href="/apply" onClick={() => setIsOpen(false)} className="text-center text-sm bg-primary hover:bg-blue-500 text-white font-semibold px-4 py-3 rounded transition-colors">
              Apply to Join
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
