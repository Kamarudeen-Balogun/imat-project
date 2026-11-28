"use client";

import { useMemo, useState } from "react";
import { Clock3, Trash2, AlertTriangle, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import FilterChips from "@/components/list/FilterChips";

type ActivityLog = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  details: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string | null; email: string | null } | null;
};

type Props = {
  logs: ActivityLog[];
  defectTitles: Record<string, string>;
  canModerate: boolean;
  deleteActivityLog: (formData: FormData) => void | Promise<void>;
};

const EVENT_LABELS: Record<string, string> = {
  defect_status_updated: "Status updated",
  defect_created: "Defect reported",
  new_defect_reported: "Defect reported",
  announcement_published: "Broadcast published",
  announcement_updated: "Broadcast updated",
  announcement_deleted: "Broadcast deleted",
  announcement_drafted: "Broadcast draft saved",
  announcement_submitted: "Broadcast submitted for approval",
  announcement_approved: "Broadcast approved",
  announcement_rejected: "Broadcast returned for changes",
  report_published: "Report published",
  wiki_created: "Wiki page created",
  wiki_updated: "Wiki page updated",
  wiki_deleted: "Wiki page deleted",
  wiki_submitted: "Wiki page submitted for approval",
  wiki_approved: "Wiki page approved",
  wiki_rejected: "Wiki page returned for changes",
  evidence_submitted: "Evidence submitted for approval",
  evidence_approved: "Evidence approved",
  evidence_rejected: "Evidence returned for changes",
};

const ENTITY_LABELS: Record<string, string> = {
  defect: "Defect",
  report: "Report",
  announcement: "Broadcast",
  wiki_page: "Wiki page",
  evidence: "Evidence",
  application: "Application",
  user: "Member",
  campaign: "Campaign",
};

const STATUS_LABELS: Record<string, string> = {
  reported: "Reported",
  assessed: "Assessed",
  escalated: "Escalated",
  acknowledged_by_works: "Acknowledged by Works",
  resolved: "Resolved",
};

// Stored titles and codes are raw database values ("acknowledged_by_works",
// "defect_status_updated") — render them the way a person would say them.
function humanise(value: string) {
  return value.replace(/[a-z0-9]+(?:_[a-z0-9]+)+/gi, (word) => {
    const lower = word.toLowerCase();
    if (STATUS_LABELS[lower]) return STATUS_LABELS[lower];
    return word
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  });
}

function eventLabel(eventType: string) {
  return EVENT_LABELS[eventType] ?? humanise(eventType);
}

function entityLabel(entityType: string) {
  return ENTITY_LABELS[entityType] ?? humanise(entityType);
}

/** Group event types into the families the owner asked to filter by. */
function eventFamily(eventType: string) {
  if (eventType === "defect_status_updated") return "status";
  if (
    eventType === "defect_created" ||
    eventType === "new_defect_reported" ||
    eventType.endsWith("_submitted")
  )
    return "submissions";
  if (eventType.endsWith("_approved") || eventType.endsWith("_rejected"))
    return "approvals";
  return "other";
}

export default function ActivityTimelineClient({ logs, defectTitles, canModerate, deleteActivityLog }: Props) {
  const [deletingLog, setDeletingLog] = useState<ActivityLog | null>(null);
  const [activeFamily, setActiveFamily] = useState("all");

  const familyCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: logs.length,
      status: 0,
      submissions: 0,
      approvals: 0,
      other: 0,
    };
    for (const log of logs) {
      counts[eventFamily(log.event_type)] += 1;
    }
    return counts;
  }, [logs]);

  const visibleLogs = useMemo(
    () =>
      activeFamily === "all"
        ? logs
        : logs.filter((log) => eventFamily(log.event_type) === activeFamily),
    [logs, activeFamily],
  );

  return (
    <>
      <div className="mb-4">
        <FilterChips
          chips={[
            { id: "all", label: "All", count: familyCounts.all },
            { id: "status", label: "Status updates", count: familyCounts.status },
            { id: "submissions", label: "Submissions", count: familyCounts.submissions },
            { id: "approvals", label: "Approvals", count: familyCounts.approvals },
            { id: "other", label: "Other", count: familyCounts.other },
          ]}
          activeId={activeFamily}
          onChange={setActiveFamily}
          ariaLabel="Filter activity by event type"
        />
      </div>

      {visibleLogs.length === 0 ? (
        <div className="empty-state">No activity matches this filter.</div>
      ) : (
      <div className="space-y-4">
        {visibleLogs.map((log) => {
          const title = defectTitles[log.entity_id ?? ""];
          const entityRef =
            log.entity_type === "defect" && log.entity_id
              ? title
                ? `${log.entity_id} — ${title}`
                : log.entity_id
              : "";
          const actor = log.actor?.full_name || log.actor?.email || "Unknown user";
          return (
          <div key={log.id} className="rounded-xl border border-soft bg-bg2 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-textDefault">{humanise(log.title)}</h2>
              <span className="text-xs font-mono text-text3 inline-flex items-center gap-1">
                <Clock3 size={12} /> {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </span>
            </div>

            <p className="mt-2 text-xs text-text3">
              {eventLabel(log.event_type)} · {entityLabel(log.entity_type)}
              {entityRef ? ` · ${entityRef}` : ""} · by {actor}
            </p>

            {canModerate ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingLog(log)}
                  className="inline-flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20 transition-colors"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            ) : null}
          </div>
          );
        })}
      </div>
      )}

      {deletingLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close delete confirmation"
            onClick={() => setDeletingLog(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-danger/30 bg-bg2 shadow-2xl shadow-black/40">
            <div className="border-b border-soft bg-danger/5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-danger/30 bg-danger/15 text-danger">
                  <AlertTriangle size={18} />
                </div>
                <button
                  type="button"
                  onClick={() => setDeletingLog(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-soft text-text3 hover:text-textDefault hover:border-text3 transition-colors"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
              <h3 className="mt-4 text-lg font-bold text-textDefault">Delete activity log?</h3>
              <p className="mt-2 text-sm text-text2">This will permanently remove this timeline entry and cannot be undone.</p>
            </div>

            <form action={deleteActivityLog} className="p-5 flex justify-end gap-2">
              <input type="hidden" name="id" value={deletingLog.id} />
              <button
                type="button"
                onClick={() => setDeletingLog(null)}
                className="rounded-lg border border-soft px-4 py-2 text-sm font-semibold text-text3 hover:border-text3 hover:text-textDefault transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-danger/40 bg-danger px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition"
              >
                <Trash2 size={14} /> Delete
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

