import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/server";
import { Activity, ArrowLeft, Clock3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

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

export default async function ActivityPage() {
  const supabase = await createSupabaseClient();

  const { data } = await supabase
    .from("activity_logs")
    .select("id, event_type, entity_type, entity_id, title, details, created_at, actor:users!activity_logs_actor_id_fkey(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  const logs = (data ?? []) as unknown as ActivityLog[];

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 pb-16">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono mb-8">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-primary font-mono text-sm uppercase tracking-wider bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 mb-4">
          <Activity size={16} /> Activity Timeline
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2">System changes and decision trail</h1>
        <p className="text-text2">Automatic activity feed for key operational actions across defects, reports, campaigns, and wiki updates.</p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-2xl border border-borderDark border-dashed bg-bg2 p-12 text-center text-text3">
          No activity recorded yet.
        </div>
      ) : (
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
