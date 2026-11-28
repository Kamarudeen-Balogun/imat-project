import { AlertCircle, CheckCircle, Clock, type LucideIcon } from "lucide-react";

/**
 * Shared public-facing defect helpers. The public site never shows internal
 * stage names: assessed and escalated both read as "Under Assessment", and
 * acknowledged_by_works reads as "Works Notified".
 */
export function publicStatusGroup(status: string): string {
  if (status === "assessed" || status === "escalated") return "under_assessment";
  return status;
}

export function publicStatusMeta(status: string): {
  label: string;
  className: string;
  Icon: LucideIcon;
} {
  switch (status) {
    case "reported":
      return { label: "Reported", className: "border-danger/30 bg-danger/10 text-danger", Icon: Clock };
    case "assessed":
    case "escalated":
      return { label: "Under Assessment", className: "border-warning/35 bg-warning/10 text-warning", Icon: AlertCircle };
    case "acknowledged_by_works":
      return { label: "Works Notified", className: "border-primary/35 bg-primary/10 text-primary", Icon: AlertCircle };
    case "resolved":
      return { label: "Resolved", className: "border-success/35 bg-success/10 text-success", Icon: CheckCircle };
    default:
      return { label: status, className: "border-borderDark bg-bg3 text-text2", Icon: Clock };
  }
}

export const BOARD_CHIPS = ["All", "Drainage", "Roads", "Walkways", "Structures"] as const;
export type BoardChip = (typeof BOARD_CHIPS)[number];

/**
 * Map a stored category value onto a board chip. Defect categories are
 * stored lowercase singular ("drainage", "road", "walkway", "structure",
 * "other"); evidence categories are stored in chip form ("Drainage",
 * "Roads", ...). Anything unmapped (e.g. "other") belongs under All only.
 */
export function boardCategory(raw: string | null | undefined): Exclude<BoardChip, "All"> | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "drainage") return "Drainage";
  if (v === "road" || v === "roads") return "Roads";
  if (v === "walkway" || v === "walkways") return "Walkways";
  if (v === "structure" || v === "structures") return "Structures";
  return null;
}
