"use client";

import { MouseEvent, useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { ChevronDown, History, Bell } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const [panelLabel, setPanelLabel] = useState("Showing last 50 notifications");
  const unreadCount = recipientId
    ? notifications.filter((notif) => notif.is_read === false).length
    : 0;

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        const { data: publicNews, error } = await supabase
          .from("announcements")
          .select("id, slug, title, body, published_at")
          .eq("visibility", "public")
          .order("published_at", { ascending: false })
          .limit(50);

        if (!error) {
          setNotifications(
            (publicNews ?? []).map((item) => ({
              id: item.id,
              title: item.title,
              body: item.body,
              created_at: item.published_at,
              href: `/newsroom/${item.slug ?? item.id}`,
              is_read: true,
            }))
          );
        }

        setPanelTitle("News History");
        setPanelLabel("Showing last 50 public newsroom posts");
        setLoading(false);
        return;
      }

      setRecipientId(data.session.user.id);

      // Fetch notifications for the current user
      const { data: notifData, error } = await supabase
        .from("notifications")
        .select("id, title, body, created_at, href, is_read")
        .eq("recipient_id", data.session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error) {
        setNotifications((notifData ?? []) as Notification[]);
      }

      setPanelTitle("Notification History");
      setPanelLabel("Showing last 50 notifications");

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
    }

    router.push(notif.href);
  };

  if (loading) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-sm">
      {/* Collapsed button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors shadow-lg"
        >
          <History size={16} />
          {panelTitle} ({notifications.length})
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
              {unreadCount} unread
            </span>
          )}
        </button>
      )}

      {/* Expanded panel */}
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-primary/30 bg-bg2 shadow-2xl overflow-hidden flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-borderDark bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-primary" />
              <h3 className="font-bold text-textDefault">{panelTitle}</h3>
              <span className="text-xs text-text3 bg-bg3 rounded-full px-2 py-1">
                {notifications.length}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-bg3 rounded-lg transition-colors"
              aria-label="Close"
            >
              <ChevronDown size={20} className="text-text3 rotate-180" />
            </button>
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto flex-1 divide-y divide-borderDark">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-text3">
                <Bell size={32} className="opacity-50 mb-2" />
                <p className="text-sm">No history yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <Link
                  key={notif.id}
                  href={notif.href ?? "#"}
                  onClick={(event) => void handleNotificationClick(event, notif)}
                  className="block px-6 py-4 hover:bg-bg3 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        recipientId && notif.is_read === false ? "bg-primary" : "bg-borderDark"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-textDefault group-hover:text-primary transition-colors line-clamp-2">
                          {notif.title}
                        </h4>
                        {recipientId && notif.is_read === false && (
                          <span className="mt-0.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Unread
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text3 mt-1 line-clamp-2">
                        {notif.body}
                      </p>
                      <p className="text-[10px] text-text3 mt-2 opacity-70">
                        {format(new Date(notif.created_at), "MMM d, yyyy • h:mm a")}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-borderDark bg-bg3 text-center">
            <p className="text-xs text-text3">{panelLabel}</p>
          </div>
        </div>
      )}
    </div>
  );
}
