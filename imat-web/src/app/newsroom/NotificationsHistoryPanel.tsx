"use client";

import { MouseEvent, useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { ChevronDown, History, Bell } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";

const GUEST_SEEN_STORAGE_KEY = "imat_news_seen_public_ids";

type Notification = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  href?: string;
  is_read?: boolean;
};

export default function NotificationsHistoryPanel() {
  const [supabase] = useState(() => createSupabaseClient());
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [panelTitle, setPanelTitle] = useState("Notification History");
  const [panelLabel, setPanelLabel] = useState("Showing last 20 notifications");
  const unreadCount = notifications.filter((notif) => notif.is_read === false).length;

  const loadGuestSeenIds = () => {
    if (typeof window === "undefined") return new Set<string>();

    const raw = window.localStorage.getItem(GUEST_SEEN_STORAGE_KEY);
    if (!raw) return new Set<string>();

    try {
      const parsed = JSON.parse(raw) as string[];
      return new Set(parsed);
    } catch {
      window.localStorage.removeItem(GUEST_SEEN_STORAGE_KEY);
      return new Set<string>();
    }
  };

  const saveGuestSeenIds = (seenIds: Set<string>) => {
    if (typeof window === "undefined") return;

    const ids = Array.from(seenIds).slice(-100);
    window.localStorage.setItem(GUEST_SEEN_STORAGE_KEY, JSON.stringify(ids));
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        const guestSeenIds = loadGuestSeenIds();

        const { data: publicNews, error } = await supabase
          .from("announcements")
          .select("id, slug, title, body, published_at")
          .eq("visibility", "public")
          .order("published_at", { ascending: false })
          .limit(20);

        if (!error) {
          setNotifications(
            (publicNews ?? []).map((item) => ({
              id: item.id,
              title: item.title,
              body: item.body,
              created_at: item.published_at,
              href: `/newsroom/${item.slug ?? item.id}`,
              is_read: guestSeenIds.has(item.id),
            }))
          );
        }

        setPanelTitle("News History");
        setPanelLabel("Showing last 20 public newsroom posts");
        setLoading(false);
        return;
      }

      setRecipientId(data.session.user.id);

      const { data: notifData, error } = await supabase
        .from("notifications")
        .select("id, title, body, created_at, href, is_read")
        .eq("recipient_id", data.session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error) {
        setNotifications((notifData ?? []) as Notification[]);
      }

      setPanelTitle("Notification History");
      setPanelLabel("Showing last 20 notifications");

      setLoading(false);
    };

    void init();
  }, [supabase]);

  const handleNotificationClick = async (event: MouseEvent<HTMLAnchorElement>, notif: Notification) => {
    if (!notif.href || notif.href === "#") {
      return;
    }

    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();

    if (recipientId && notif.is_read === false) {
      setNotifications((current) =>
        current.map((item) => (item.id === notif.id ? { ...item, is_read: true } : item))
      );

      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notif.id)
        .eq("recipient_id", recipientId);
    } else if (!recipientId && notif.is_read === false) {
      setNotifications((current) =>
        current.map((item) => (item.id === notif.id ? { ...item, is_read: true } : item))
      );

      const guestSeenIds = loadGuestSeenIds();
      guestSeenIds.add(notif.id);
      saveGuestSeenIds(guestSeenIds);
    }

    router.push(notif.href);
  };

  if (loading) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-sm">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors shadow-lg"
        >
          <History size={16} />
          History ({notifications.length})
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
              {unreadCount} unread
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="animate-in fade-in slide-in-from-bottom-4 flex max-h-[min(70dvh,32rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-primary/30 bg-bg2 shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-borderDark bg-gradient-to-r from-primary/10 to-transparent px-6 py-4">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-primary" />
              <h3 className="font-bold text-textDefault">{panelTitle}</h3>
              <span className="rounded-full bg-bg3 px-2 py-1 text-xs text-text3">
                {notifications.length}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 transition-colors hover:bg-bg3"
              aria-label="Close"
            >
              <ChevronDown size={20} className="text-text3 rotate-180" />
            </button>
          </div>

          <div className="min-h-0 flex-1 divide-y divide-borderDark overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-text3">
                <Bell size={32} className="mb-2 opacity-50" />
                <p className="text-sm">No history yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <Link
                  key={notif.id}
                  href={notif.href ?? "#"}
                  onClick={(event) => void handleNotificationClick(event, notif)}
                  className="group block cursor-pointer px-6 py-4 transition-colors hover:bg-bg3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-2 h-2 w-2 flex-shrink-0 rounded-full ${
                        notif.is_read === false ? "bg-primary" : "bg-borderDark"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-textDefault transition-colors group-hover:text-primary line-clamp-2">
                          {notif.title}
                        </h4>
                        {notif.is_read === false && (
                          <span className="mt-0.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Unread
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-text3 line-clamp-2">
                        {notif.body}
                      </p>
                      <p className="mt-2 text-[10px] text-text3 opacity-70">
                        {format(new Date(notif.created_at), "MMM d, yyyy • h:mm a")}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="border-t border-borderDark bg-bg3 px-6 py-3 text-center">
            <p className="text-xs text-text3">{panelLabel}</p>
          </div>
        </div>
      )}
    </div>
  );
}
