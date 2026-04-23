"use client";

import { motion } from "framer-motion";

export type FloatingDockItem = {
  id: string;
  title: string;
  href: string;
  enabled?: boolean;
  icon: React.ReactNode;
};

export function FloatingDock({
  items,
  className,
}: {
  items: FloatingDockItem[];
  className?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center ${className ?? ""}`}>
      <div className="inline-flex items-center gap-1.5 rounded-3xl border border-soft bg-bg/80 px-2 py-2 shadow-2xl backdrop-blur-xl sm:gap-2 sm:px-2.5 sm:py-2.5">
        {items.map((item) => {
          const isEnabled = item.enabled !== false;

          return (
            <motion.a
              key={item.id}
              href={isEnabled ? item.href || "#" : "#"}
              target={isEnabled ? "_blank" : undefined}
              rel={isEnabled ? "noreferrer" : undefined}
              className={`group relative flex h-9 w-9 items-center justify-center rounded-full border border-soft bg-surface text-text2 transition-colors sm:h-10 sm:w-10 ${
                isEnabled ? "cursor-pointer hover:text-primary" : "cursor-default opacity-45"
              }`}
              whileTap={isEnabled ? { scale: 0.96 } : undefined}
              transition={{ duration: 0.2, ease: "easeOut" }}
              aria-label={item.title}
              title={item.title}
              onClick={(event) => {
                if (!isEnabled) {
                  event.preventDefault();
                }
              }}
            >
              <span
                className={`pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-soft bg-bg2/95 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-text2 opacity-0 transition-opacity duration-200 sm:text-[10px] ${
                  isEnabled ? "group-hover:opacity-100" : ""
                }`}
              >
                {item.title}
              </span>
              <span
                className={`absolute -inset-0.5 rounded-full bg-gradient-to-r from-primary/35 via-accent/35 to-success/35 blur-md transition-opacity ${
                  isEnabled ? "opacity-0 group-hover:opacity-100" : "opacity-0"
                }`}
              />
              <span
                className={`relative z-10 h-3.5 w-3.5 transition-transform duration-500 sm:h-4 sm:w-4 ${
                  isEnabled ? "group-hover:rotate-[360deg] group-hover:scale-150" : ""
                }`}
              >
                {item.icon}
              </span>
            </motion.a>
          );
        })}
      </div>
    </div>
  );
}