import { redirect } from "next/navigation";
import { Mail, Search } from "lucide-react";
import { format } from "date-fns";
import { createSupabaseClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export const dynamic = "force-dynamic";

type EmailLogRow = {
  id: string;
  type: string;
  recipient: string;
  subject: string;
  status: string;
  resend_id: string | null;
  error: string | null;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  application_received: "Application received",
  acceptance: "Acceptance",
  rejection: "Rejection",
  invite: "Invite (resent)",
  password_reset: "Password reset",
  announcement: "Announcement",
  contact_received: "Contact confirmation",
  general: "General",
};

const TYPE_OPTIONS = Object.keys(TYPE_LABELS);

function formatType(type: string) {
  return TYPE_LABELS[type] ?? type.replaceAll("_", " ");
}

export default async function DashboardEmailLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const typeFilter = typeof params.type === "string" ? params.type : "";
  const query = typeof params.q === "string" ? params.q.trim() : "";

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

  let queryBuilder = supabase
    .from("email_logs")
    .select("id, type, recipient, subject, status, resend_id, error, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (typeFilter && TYPE_OPTIONS.includes(typeFilter)) {
    queryBuilder = queryBuilder.eq("type", typeFilter);
  }

  if (query) {
    const escaped = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
    queryBuilder = queryBuilder.ilike("recipient", `%${escaped}%`);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.warn("Failed to load email logs.", error);
  }

  const logs = (data ?? []) as unknown as EmailLogRow[];
  const failedCount = logs.filter((log) => log.status === "failed").length;

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-500 px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumbs className="mb-8" />

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-primary mb-4">
          <Mail size={14} /> Mail Log
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2">Mail log</h1>
        <p className="text-text2 max-w-2xl">
          Every email the site has sent via Resend, newest first.{" "}
          {logs.length > 0
            ? `${logs.length} shown${failedCount > 0 ? `, ${failedCount} failed` : ", all sent"}.`
            : "Nothing here yet — entries appear here from the moment this page went live."}
        </p>
      </div>

      <form
        method="get"
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <select
          name="type"
          defaultValue={typeFilter}
          aria-label="Filter by mail type"
          className="w-full sm:w-64 p-3 bg-bg border border-soft rounded-lg focus:border-primary focus:outline-none text-textDefault"
        >
          <option value="">All types</option>
          {TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <div className="relative flex-grow">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by recipient email…"
            aria-label="Search by recipient email"
            className="w-full p-3 pl-9 bg-bg border border-soft rounded-lg focus:border-primary focus:outline-none text-textDefault placeholder-text3"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500"
        >
          Filter
        </button>
      </form>

      {error ? (
        <div className="glass-panel rounded-2xl border border-soft p-12 text-center text-text3">
          Could not load the mail log. Please try again later.
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          No emails match these filters yet.
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-soft text-xs uppercase tracking-wider text-text3">
                <th className="px-4 py-3 font-bold">Type</th>
                <th className="px-4 py-3 font-bold">Recipient</th>
                <th className="px-4 py-3 font-bold">Subject</th>
                <th className="px-4 py-3 font-bold">When</th>
                <th className="px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-soft last:border-0 align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center rounded-full border border-soft bg-bg px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-text3">
                      {formatType(log.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 break-all text-textDefault">{log.recipient}</td>
                  <td className="px-4 py-3 text-textDefault">
                    <span className="break-words">{log.subject}</span>
                    {log.status === "failed" && log.error && (
                      <span className="mt-1 block text-xs text-danger break-words">
                        {log.error}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-text2">
                    {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {log.status === "sent" ? (
                      <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-primary">
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-danger">
                        Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
