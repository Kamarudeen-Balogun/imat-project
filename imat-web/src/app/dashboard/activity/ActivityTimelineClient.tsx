"use client";

import { useState } from "react";
import { Clock3, Trash2, AlertTriangle, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  canModerate: boolean;
  deleteActivityLog: (formData: FormData) => void | Promise<void>;
};

export default function ActivityTimelineClient({ logs, canModerate, deleteActivityLog }: Props) {
  const [deletingLog, setDeletingLog] = useState<ActivityLog | null>(null);

  return (
    <>
      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="rounded-xl border border-borderDark bg-bg2 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-textDefault">{log.title}</h2>
              <span className="text-xs font-mono text-text3 inline-flex items-center gap-1">
                <Clock3 size={12} /> {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-2 py-1 rounded bg-bg border border-borderDark text-text3 uppercase">{log.event_type}</span>
              <span className="px-2 py-1 rounded bg-bg border border-borderDark text-text3 uppercase">{log.entity_type}</span>
              {log.entity_id && (
                <span className="px-2 py-1 rounded bg-bg border border-borderDark text-text3">{log.entity_id}</span>
              )}
            </div>

            <div className="mt-3 text-sm text-text2">
              By {log.actor?.full_name || log.actor?.email || "Unknown user"}
            </div>

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
        ))}
      </div>

      {deletingLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close delete confirmation"
            onClick={() => setDeletingLog(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-danger/30 bg-bg2 shadow-2xl shadow-black/40">
            <div className="border-b border-borderDark bg-gradient-to-r from-danger/15 via-danger/5 to-transparent p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-danger/30 bg-danger/15 text-danger">
                  <AlertTriangle size={18} />
                </div>
                <button
                  type="button"
                  onClick={() => setDeletingLog(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-borderDark text-text3 hover:text-textDefault hover:border-text3 transition-colors"
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
                className="rounded-lg border border-borderDark px-4 py-2 text-sm font-semibold text-text3 hover:border-text3 hover:text-textDefault transition-colors"
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
