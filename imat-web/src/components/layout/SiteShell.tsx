"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import type { Transition } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import BrowserNewsNotifier from "@/components/notifications/BrowserNewsNotifier";
import MouseTrail from "@/components/MouseTrail";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const prefersReducedMotion = useReducedMotion();
  const easingCurve = [0.22, 1, 0.36, 1] as const;

  const mainInitial = prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 };
  const mainAnimate = { opacity: 1, y: 0 };
  const mainTransition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.45, ease: easingCurve };

  return (
    <>
      <BrowserNewsNotifier />
      <MouseTrail />
      {!isDashboardRoute && <Navbar />}
      <motion.main
        key={pathname}
        className="futuristic-grid relative flex-grow"
        initial={mainInitial}
        animate={mainAnimate}
        transition={mainTransition}
      >
        {children}
      </motion.main>
      {!isDashboardRoute && <Footer />}
    </>
  );
}