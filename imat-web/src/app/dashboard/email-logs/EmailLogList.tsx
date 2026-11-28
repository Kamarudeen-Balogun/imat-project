"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { format } from "date-fns";
import FilterChips from "@/components/list/FilterChips";

export type EmailLogRow = {
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

function formatType(type: string) {
  return TYPE_LABELS[type] ?? type.replaceAll("_", " ");
}

type CategoryId =
  | "all"
  | "announcements"
  | "applications"
  | "password_resets"
  | "contact"
  | "other";

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "announcements", label: "Announcements" },
  { id: "applications", label: "Applications" },
  { id: "password_resets", label: "Password resets" },
  { id: "contact", label: "Contact" },
  { id: "other", label: "Other" },
];

/** Which category a log type belongs to. Anything not listed lands in Other. */
function categoryOf(type: string): Exclude<CategoryId, "all"> {
  if (type === "announcement") return "announcements";
  if (
    type === "acceptance" ||
    type === "rejection" ||
    type === "application_received"
  )
    return "applications";
  if (type === "password_reset") return "password_resets";
  if (type.startsWith("contact")) return "contact";
  return "other";
}

type LogGroup = {
  key: string;
  type: string;
  subject: string;
  createdAt: string;
  rows: EmailLogRow[];
};

/**
 * Two rows belong to one send event when they share the same type, the same
 * subject, and the same created_at minute. That is the announcement fan-out
 * case: one publish logs one row per recipient within the same minute, so
 * they collapse into a single card. Rows from different minutes (or with a
 * different subject/type) stay separate, even for the same announcement.
 */
function groupLogs(rows: EmailLogRow[]): LogGroup[] {
  const groups = new Map<string, LogGroup>();
  for (const row of rows) {
    const minute = row.created_at.slice(0, 16);
    const key = `${row.type}|${row.subject}|${minute}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      groups.set(key, {
        key,
        type: row.type,
        subject: row.subject,
        createdAt: row.created_at,
        rows: [row],
      });
    }
  }
  return [...groups.values()];
}

function formatWhen(iso: string) {
  return format(new Date(iso), "MMM d, yyyy HH:mm");
}

function statusSummary(rows: EmailLogRow[]) {
  const sent = rows.filter((row) => row.status === "sent").length;
  const failed = rows.length - sent;
  if (failed === 0) return `${sent} sent`;
  if (sent === 0) return `${failed} failed`;
  return `${sent} sent · ${failed} failed`;
}

export default function EmailLogList({ logs }: { logs: EmailLogRow[] }) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [query, setQuery] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (log) =>
        log.recipient.toLowerCase().includes(q) ||
        log.subject.toLowerCase().includes(q),
    );
  }, [logs, query]);

  const counts = useMemo(() => {
    const result: Record<CategoryId, number> = {
      all: searched.length,
      announcements: 0,
      applications: 0,
      password_resets: 0,
      contact: 0,
      other: 0,
    };
    for (const log of searched) {
      result[categoryOf(log.type)] += 1;
    }
    return result;
  }, [searched]);

  const groups = useMemo(() => {
    const filtered =
      activeCategory === "all"
        ? searched
        : searched.filter((log) => categoryOf(log.type) === activeCategory);
    return groupLogs(filtered);
  }, [searched, activeCategory]);

  const totalEmails = groups.reduce((sum, group) => sum + group.rows.length, 0);
  const failedEmails = groups.reduce(
    (sum, group) =>
      sum + group.rows.filter((row) => row.status === "failed").length,
    0,
  );

  function toggleExpanded(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function expandAll() {
    setExpandedKeys(new Set(groups.map((group) => group.key)));
  }

  function collapseAll() {
    setExpandedKeys(new Set());
  }

  const activeLabel =
    CATEGORIES.find((category) => category.id === activeCategory)?.label ?? "All";

  return (
    <div>
      <p className="text-text2 max-w-2xl">
        {groups.length > 0 ? (
          <>
            {activeCategory === "all" ? (
              <>
                {groups.length} send{groups.length === 1 ? "" : "s"} ·{" "}
                {totalEmails} email{totalEmails === 1 ? "" : "s"}
              </>
            ) : (
              <>
                {activeLabel}: {groups.length} send
                {groups.length === 1 ? "" : "s"} · {totalEmails} email
                {totalEmails === 1 ? "" : "s"}
              </>
            )}
            {failedEmails > 0
              ? `, ${failedEmails} failed.`
              : ", all sent."}
          </>
        ) : (
          "Nothing here yet — entries appear here from the moment this page went live."
        )}
      </p>

      {/* Category chips — counts reflect the current search. */}
      <div className="mt-6">
        <FilterChips
          chips={CATEGORIES.map((category) => ({
            id: category.id,
            label: category.label,
            count: counts[category.id],
          }))}
          activeId={activeCategory}
          onChange={(id) => setActiveCategory(id as CategoryId)}
          ariaLabel="Filter mail by category"
        />
      </div>

      {/* Search — matches recipient email or subject, works with the chips. */}
      <div className="relative mt-4">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text3"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by recipient email or subject…"
          aria-label="Search by recipient email or subject"
          className="w-full rounded-lg border border-soft bg-bg p-3 pl-9 text-textDefault placeholder-text3 focus:border-primary focus:outline-none"
        />
      </div>

      {groups.length === 0 ? (
        <div className="empty-state mt-6">
          No emails match these filters yet.
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="btn btn-outline btn-sm"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="btn btn-outline btn-sm"
            >
              Collapse all
            </button>
            <span className="ml-auto text-xs font-mono text-text3">
              {groups.length} send{groups.length === 1 ? "" : "s"} shown
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {groups.map((group) => {
              const isExpanded = expandedKeys.has(group.key);
              const isGrouped = group.rows.length > 1;
              const hasFailure = group.rows.some(
                (row) => row.status !== "sent",
              );
              return (
                <article
                  key={group.key}
                  className="glass-panel overflow-hidden rounded-xl"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(group.key)}
                    aria-expanded={isExpanded}
                    className="flex min-h-[40px] w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-bg3/60"
                  >
                    <span
                      aria-hidden
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        hasFailure ? "bg-danger" : "bg-success"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="inline-flex items-center rounded-full border border-soft bg-bg px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-text3">
                          {formatType(group.type)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-textDefault">
                          {group.subject}
                        </span>
                      </span>
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text2">
                        {isGrouped ? (
                          <span>
                            {group.rows.length} recipients ·{" "}
                            {statusSummary(group.rows)}
                          </span>
                        ) : (
                          <span className="min-w-0 break-all">
                            {group.rows[0].recipient}
                          </span>
                        )}
                        <span className="shrink-0">{formatWhen(group.createdAt)}</span>
                      </span>
                    </span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-text3 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-soft px-4 py-4 sm:px-5">
                      <p className="break-words text-sm font-semibold text-textDefault">
                        {group.subject}
                      </p>
                      <p className="mt-1 text-xs text-text3">
                        {formatWhen(group.createdAt)} ·{" "}
                        {statusSummary(group.rows)}
                      </p>
                      <ul className="mt-3 space-y-3">
                        {group.rows.map((row) => (
                          <li
                            key={row.id}
                            className="rounded-lg border border-soft bg-bg px-3 py-2.5"
                          >
                            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="min-w-0 flex-1 break-all text-sm text-textDefault">
                                {row.recipient}
                              </span>
                              {row.status === "sent" ? (
                                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-primary">
                                  Sent
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-danger">
                                  Failed
                                </span>
                              )}
                            </span>
                            {row.resend_id && (
                              <span className="mt-1 block break-all font-mono text-[11px] text-text3">
                                {row.resend_id}
                              </span>
                            )}
                            {row.status === "failed" && row.error && (
                              <span className="mt-1 block break-words text-xs text-danger">
                                {row.error}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
