import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import EmailLogList, { type EmailLogRow } from "./EmailLogList";

export const dynamic = "force-dynamic";

export default async function DashboardEmailLogsPage() {
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

  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return (
      <div className="mx-auto max-w-2xl animate-in fade-in duration-500 pb-20">
        <Breadcrumbs className="mb-8" />
        <div className="glass-panel rounded-2xl p-8 text-center">
          <h1 className="text-xl font-bold text-textDefault">Access denied</h1>
          <p className="mt-2 text-sm text-text2">
            Only the owner and admins can view the mail log.
          </p>
        </div>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("email_logs")
    .select("id, type, recipient, subject, status, resend_id, error, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.warn("Failed to load email logs.", error);
  }

  const logs = (data ?? []) as unknown as EmailLogRow[];

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-500 px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumbs className="mb-8" />

      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-primary mb-4">
          <Mail size={14} /> Mail Log
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2">Mail log</h1>
        <p className="text-text2 max-w-2xl">
          Every email the site has sent via Resend, newest first.
        </p>
      </div>

      {error ? (
        <div className="glass-panel rounded-2xl border border-soft p-12 text-center text-text3">
          Could not load the mail log. Please try again later.
        </div>
      ) : (
        <EmailLogList logs={logs} />
      )}

      {logs.length >= 200 && (
        <p className="mt-6 text-xs text-text3">
          Showing the newest 200 entries.
        </p>
      )}
    </div>
  );
}
