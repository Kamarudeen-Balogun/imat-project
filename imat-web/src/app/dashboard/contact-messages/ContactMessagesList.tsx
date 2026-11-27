"use client";

import { useState } from "react";
import { Calendar, ChevronDown, MailOpen, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { deleteMessage, markMessageAsRead } from "./actions";

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  purpose: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

const PURPOSE_LABELS: Record<string, string> = {
  partnership: "Partnership",
  media_inquiries: "Media Inquiries",
  infrastructure_related_concern: "Infrastructure Related Concern",
  meetings: "Meetings",
  contact_developer: "Contact Developer",
};

function formatPurpose(purpose: string) {
  return PURPOSE_LABELS[purpose] ?? purpose.replaceAll("_", " ");
}

export default function ContactMessagesList({
  messages,
  isOwner,
}: {
  messages: ContactMessageRow[];
  isOwner: boolean;
}) {
  // Cards start collapsed so a long inbox is easy to scan — same pattern
  // as the applications page.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(messages.map((message) => message.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  if (messages.length === 0) {
    return <div className="empty-state">No contact messages yet.</div>;
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={expandAll} className="btn btn-ghost btn-sm">
          Expand all
        </button>
        <button type="button" onClick={collapseAll} className="btn btn-ghost btn-sm">
          Collapse all
        </button>
        <span className="ml-auto text-xs font-mono text-text3">
          {messages.length} message{messages.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-4">
        {messages.map((message) => {
          const isExpanded = expandedIds.has(message.id);
          return (
            <article key={message.id} className="glass-panel rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleExpanded(message.id)}
                aria-expanded={isExpanded}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-bg3/60 sm:px-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-soft bg-bg px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-text3">
                      {formatPurpose(message.purpose)}
                    </span>
                    {!message.is_read && (
                      <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-primary">
                        New
                      </span>
                    )}
                    <span className="font-bold text-textDefault break-words">{message.subject}</span>
                  </span>
                  <span className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-text2">
                    <span className="font-semibold text-textDefault break-words">{message.name}</span>
                    <span className="min-w-0 break-all">{message.email}</span>
                    <span>{format(new Date(message.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  </span>
                </span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-text3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {isExpanded && (
                <div className="border-t border-soft px-4 py-5 sm:px-5 md:px-6">
                  <p className="whitespace-pre-wrap break-words text-sm text-text2">
                    {message.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-text3 border-t border-soft pt-4 mt-4">
                    <span className="inline-flex items-center gap-2">
                      <Calendar size={14} />{" "}
                      {format(new Date(message.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-soft bg-bg px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-text3">
                      {formatPurpose(message.purpose)}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {!message.is_read && (
                      <form action={markMessageAsRead}>
                        <input type="hidden" name="message_id" value={message.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-soft px-3 py-1.5 text-xs font-semibold text-text3 transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          <MailOpen size={14} /> Mark read
                        </button>
                      </form>
                    )}
                    {isOwner && (
                      <form action={deleteMessage}>
                        <input type="hidden" name="message_id" value={message.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
