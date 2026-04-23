"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import BrowserNewsNotifier from "@/components/notifications/BrowserNewsNotifier";
import MouseTrail from "@/components/MouseTrail";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const prefersReducedMotion = useReducedMotion();

  const mainAnimation = prefersReducedMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <>
      <BrowserNewsNotifier />
      <MouseTrail />
      {!isDashboardRoute && <Navbar />}
      <motion.main
        key={pathname}
        className="futuristic-grid relative flex-grow"
        initial={mainAnimation.initial}
        animate={mainAnimation.animate}
        transition={mainAnimation.transition}
      >
        {children}
      </motion.main>
      {!isDashboardRoute && <Footer />}
    </>
  );
}