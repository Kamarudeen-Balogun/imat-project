import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "@/lib/supabase/server";
import { Activity } from "lucide-react";
import { canModerateActivity } from "@/lib/access";
import ActivityTimelineClient from "./ActivityTimelineClient";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

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

async function deleteActivityLog(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!canModerateActivity(profile?.role)) {
    redirect("/dashboard");
  }

  await supabase.from("activity_logs").delete().eq("id", id);
  revalidatePath("/dashboard/activity");
  redirect("/dashboard/activity");
}

export default async function ActivityPage() {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const canModerate = canModerateActivity(profile?.role);

  const { data } = await supabase
    .from("activity_logs")
    .select("id, event_type, entity_type, entity_id, title, details, created_at, actor:users!activity_logs_actor_id_fkey(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  const logs = (data ?? []) as unknown as ActivityLog[];

  // Resolve defect codes to titles so the timeline never shows a bare
  // UUID for a defect event.
  const defectIds = [
    ...new Set(
      logs
        .filter((log) => log.entity_type === "defect" && log.entity_id?.startsWith("DEF-"))
        .map((log) => log.entity_id as string)
    ),
  ];
  let defectTitles: Record<string, string> = {};
  if (defectIds.length > 0) {
    const { data: defectRows } = await supabase
      .from("defects")
      .select("id, title")
      .in("id", defectIds);
    defectTitles = Object.fromEntries(
      ((defectRows ?? []) as { id: string; title: string }[]).map((row) => [row.id, row.title])
    );
  }

   return (
     <div className="mx-auto max-w-5xl animate-in fade-in duration-500 px-4 pb-16 pt-6 sm:px-6">
       <Breadcrumbs className="mb-8" />

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-primary font-mono text-sm uppercase tracking-wider bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 mb-4">
          <Activity size={16} /> Activity Timeline
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2">System changes and decision trail</h1>
        <p className="text-text2">Automatic activity feed for key operational actions across defects, reports, campaigns, and wiki updates.</p>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">
          No activity recorded yet.
        </div>
      ) : (
        <ActivityTimelineClient
          logs={logs}
          defectTitles={defectTitles}
          canModerate={canModerate}
          deleteActivityLog={deleteActivityLog}
        />
      )}
    </div>
  );
}

