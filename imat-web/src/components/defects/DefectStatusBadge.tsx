import { publicStatusMeta } from "@/lib/defects";

/** Public status badge for a defect (or an evidence item mapped to a defect status). */
export default function DefectStatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const meta = publicStatusMeta(status);
  const Icon = meta.Icon;
  const isKnown = ["reported", "assessed", "escalated", "acknowledged_by_works", "resolved"].includes(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-3 py-1 font-mono text-xs font-bold ${meta.className} ${isKnown ? "" : "uppercase"} ${className}`}
    >
      <Icon size={12} />
      {meta.label}
    </span>
  );
}
