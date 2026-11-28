"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/dashboard/notifications/actions";

type BellNotification = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  href: string | null;
  is_read: boolean;
  type: string;
};

/**
 * Dashboard notification bell. There was no bell in the dashboard header —
 * the only notification UI was the public newsroom's History panel. This
 * one is per-member: unread-count badge from the notifications table
 * (recipient_id = the signed-in user), a dropdown listing their
 * notifications newest first, click-through where a link exists, and
 * mark-one-read / mark-all-read. Lightweight: it fetches on mount, on
 * navigation, and when opened — no realtime subscription.
 */
export default function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<BellNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const load = useCallback(async (ownerId: string) => {
    const supabase = createSupabaseClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, created_at, href, is_read, type")
      .eq("recipient_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data as unknown as BellNotification[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setLoading(false);
        return;
      }
      setUserId(session.user.id);
      await load(session.user.id);
      if (!cancelled) setLoading(false);
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // The layout persists across dashboard pages, so refresh the badge when
  // the member navigates (e.g. after publishing something).
  useEffect(() => {
    if (userId) void load(userId);
  }, [pathname, userId, load]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((notif) => !notif.is_read).length;

  const handleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && userId) void load(userId);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((current) =>
      current.map((notif) => ({ ...notif, is_read: true })),
    );
  };

  const handleNotificationClick = async (notif: BellNotification) => {
    if (!notif.is_read) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notif.id ? { ...item, is_read: true } : item,
        ),
      );
      await markNotificationRead(notif.id);
    }
    setIsOpen(false);
    if (notif.href) router.push(notif.href);
  };

  if (loading || !userId) {
    return null;
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={isOpen}
        className="btn-ghost btn-sm relative !px-2.5"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 flex max-h-[70dvh] w-[min(92vw,22rem)] min-h-0 flex-col overflow-hidden rounded-xl border border-soft bg-bg2 shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-soft px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-primary" />
              <h3 className="text-sm font-bold text-textDefault">Notifications</h3>
              <span className="rounded-full bg-bg3 px-2 py-0.5 text-xs text-text3">
                {notifications.length}
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-text3">
                <Bell size={32} className="mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => void handleNotificationClick(notif)}
                  className="block w-full cursor-pointer border-b border-soft px-4 py-3 text-left transition-colors last:border-0 hover:bg-bg3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        notif.is_read ? "bg-borderDark" : "bg-primary"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold leading-snug text-textDefault">
                          {notif.title}
                        </span>
                        {!notif.is_read && (
                          <span className="mt-0.5 shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Unread
                          </span>
                        )}
                      </span>
                      {notif.body && (
                        <span className="mt-1 block text-xs text-text3 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                          {notif.body}
                        </span>
                      )}
                      <span className="mt-1.5 block text-[10px] text-text3 opacity-70">
                        {format(new Date(notif.created_at), "MMM d, yyyy • h:mm a")}
                      </span>
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
