"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FloatingDock, type FloatingDockItem } from "@/components/ui/floating-dock";
import { createSupabaseClient } from "@/lib/supabase/client";
import { defaultSocialLinks, mergeSocialLinks } from "@/lib/socialLinks";

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-full w-full">
      <path d="M18.244 2H21l-6.02 6.88L22 22h-5.46l-4.28-5.58L7.36 22H4.6l6.44-7.36L2 2h5.6l3.87 5.1L18.244 2Zm-.96 18h1.52L6.78 3.9H5.17L17.284 20Z" />
    </svg>
  );
}

function InstagramLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-full w-full">
      <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.75A4 4 0 0 0 3.75 7.75v8.5a4 4 0 0 0 4 4h8.5a4 4 0 0 0 4-4v-8.5a4 4 0 0 0-4-4h-8.5Zm8.88 1.37a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z" />
    </svg>
  );
}

function GitHubLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-full w-full">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.2-3.37-1.2-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.52 1.03 1.52 1.03.88 1.5 2.32 1.07 2.88.82.09-.64.35-1.07.63-1.31-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.28.1-2.67 0 0 .84-.27 2.75 1.03A9.54 9.54 0 0 1 12 6.84c.85 0 1.71.11 2.51.33 1.9-1.3 2.74-1.03 2.74-1.03.56 1.39.21 2.42.1 2.67.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.58 4.93.36.31.68.92.68 1.86V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function LinkedInLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-full w-full">
      <path d="M4.98 3.5A2.48 2.48 0 1 1 5 8.46a2.48 2.48 0 0 1-.02-4.96ZM3 9.75h4v11.25H3V9.75Zm7.25 0h3.83v1.54h.05c.53-1.01 1.84-2.07 3.79-2.07 4.05 0 4.8 2.66 4.8 6.12V21h-4v-4.93c0-1.18-.02-2.7-1.64-2.7-1.65 0-1.9 1.29-1.9 2.62V21h-3.93V9.75Z" />
    </svg>
  );
}

function YouTubeLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-full w-full">
      <path d="M21.58 7.19a2.99 2.99 0 0 0-2.1-2.11C17.6 4.5 12 4.5 12 4.5s-5.6 0-7.48.58a2.99 2.99 0 0 0-2.1 2.11A31.5 31.5 0 0 0 2 12a31.5 31.5 0 0 0 .42 4.81 2.99 2.99 0 0 0 2.1 2.11C6.4 19.5 12 19.5 12 19.5s5.6 0 7.48-.58a2.99 2.99 0 0 0 2.1-2.11c.28-1.58.42-3.17.42-4.81 0-1.64-.14-3.23-.42-4.81ZM10 15.2V8.8l5.2 3.2-5.2 3.2Z" />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-full w-full">
      <path d="M13.5 21v-7.12h2.39l.36-2.78H13.5V9.33c0-.8.22-1.35 1.37-1.35h1.46V5.5c-.25-.03-1.12-.1-2.12-.1-2.1 0-3.54 1.28-3.54 3.64v2.06H8.28v2.78h2.39V21h2.83Z" />
    </svg>
  );
}

export function Footer() {
  const [socialLinks, setSocialLinks] = useState(defaultSocialLinks);

  useEffect(() => {
    const loadSocialLinks = async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from("site_social_links")
        .select("id, platform, label, url, is_enabled, sort_order")
        .order("sort_order", { ascending: true });

      setSocialLinks(mergeSocialLinks((data ?? []) as typeof defaultSocialLinks));
    };

    void loadSocialLinks();
  }, []);

  const dockItems = useMemo<FloatingDockItem[]>(() => {
    const iconMap = {
      twitter: <XLogo />,
      instagram: <InstagramLogo />,
      github: <GitHubLogo />,
      linkedin: <LinkedInLogo />,
      youtube: <YouTubeLogo />,
      facebook: <FacebookLogo />,
    } as const;

    return socialLinks.map((item) => ({
      id: item.platform,
      title: item.label,
      href: item.url,
      enabled: item.is_enabled,
      icon: iconMap[item.platform],
    }));
  }, [socialLinks]);

  return (
    <footer className="relative mt-20 border-t border-borderDark bg-bg2/60 py-14 backdrop-blur-sm md:mt-24">
      <div className="absolute -top-40 left-0 h-40 w-full bg-gradient-to-t from-transparent to-bg/0" />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 md:grid-cols-4">
        <div className="col-span-1 md:col-span-2">
          <p className="mb-3 inline-flex rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-mono font-semibold uppercase tracking-[0.16em] text-accent">
            Infrastructure Maintenance Awareness Team
          </p>
          <h3 className="mb-4 text-xl font-bold text-textDefault">
            <span className="bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent">IMAT</span>{" "}
            <span className="text-text2">FUTA</span>
          </h3>
          <p className="max-w-sm text-sm leading-relaxed text-text2">
            Student-led infrastructure advocacy body within the Civil Engineering Department at the Federal University of Technology, Akure.
          </p>
        </div>

        <div>
          <h4 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-accent">Quick Links</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/" className="text-text2 transition-all hover:text-accent hover:translate-x-1">Home</Link></li>
            <li><Link href="/about" className="text-text2 transition-all hover:text-accent hover:translate-x-1">About Us</Link></li>
            <li><Link href="/newsroom" className="text-text2 transition-all hover:text-accent hover:translate-x-1">Newsroom</Link></li>
            <li><Link href="/apply" className="text-text2 transition-all hover:text-accent hover:translate-x-1">Apply to Join</Link></li>
            <li><Link href="/login" className="text-text2 transition-all hover:text-accent hover:translate-x-1">Member Login</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-accent">Resources</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/evidence" className="text-text2 transition-all hover:text-accent hover:translate-x-1">Evidence Gallery</Link></li>
            <li><Link href="/issues" className="text-text2 transition-all hover:text-accent hover:translate-x-1">Public Issue Tracker</Link></li>
            <li><Link href="/report" className="text-text2 transition-all hover:text-accent hover:translate-x-1">Quick Report</Link></li>
            <li><Link href="/dashboard" className="text-text2 transition-all hover:text-accent hover:translate-x-1">Member Portal</Link></li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        <p className="mb-4 text-center text-xs font-mono uppercase tracking-[0.18em] text-text3">Connect with IMAT</p>
        <FloatingDock items={dockItems} />
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-2 border-t border-borderDark px-4 pt-8 text-center text-xs text-text3 sm:px-6 md:flex-row md:text-left">
        <p suppressHydrationWarning>&copy; {new Date().getFullYear()} IMAT FUTA. All rights reserved.</p>
        <p>Built with <span className="text-accent">♦</span> by <a href="mailto:codeflowx1@gmail.com" className="transition-all hover:text-accent hover:underline">codeflowx1@gmail.com</a></p>
      </div>
    </footer>
  );
}
