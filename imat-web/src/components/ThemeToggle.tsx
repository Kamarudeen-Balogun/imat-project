"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/components/ThemeProvider";

const OPTIONS: Array<{ id: Theme; label: string; Icon: typeof Sun }> = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
];

/** Shared Light / Dark / System segmented control, used by the public
    navbar and the dashboard header. The choice is persisted by the
    ThemeProvider; first load with no stored choice is Light. */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme"
      className="inline-flex items-center rounded-md border border-borderDark bg-bg p-0.5"
    >
      {OPTIONS.map(({ id, label, Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            aria-pressed={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            className={`inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-bold transition-colors ${
              active ? "bg-primary text-white" : "text-text2 hover:text-textDefault"
            }`}
          >
            <Icon size={15} />
            {!compact && <span className="hidden xl:inline">{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
