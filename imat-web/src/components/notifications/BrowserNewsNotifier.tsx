"use client";

import { useEffect, useRef } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { ensurePushServiceWorker } from "@/lib/push/client";

const ALERTS_STORAGE_KEY = "imat_news_alerts_enabled";
const GUEST_SEEN_STORAGE_KEY = "imat_news_seen_public_ids";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  href: string;
};

type AnnouncementRow = {
  id: string;
  slug: string | null;
  title: string;
  body: string;
};

export default function BrowserNewsNotifier() {
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createSupabaseClient();
    let recipientId: string | null = null;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const areAlertsEnabled = () => {
      if (typeof window === "undefined") return false;
      return window.localStorage.getItem(ALERTS_STORAGE_KEY) === "true";
    };

    const loadGuestSeen = () => {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(GUEST_SEEN_STORAGE_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as string[];
        parsed.forEach((id) => seenIdsRef.current.add(id));
      } catch {
        window.localStorage.removeItem(GUEST_SEEN_STORAGE_KEY);
      }
    };

    const saveGuestSeen = () => {
      if (typeof window === "undefined") return;
      const ids = Array.from(seenIdsRef.current).slice(-100);
      window.localStorage.setItem(GUEST_SEEN_STORAGE_KEY, JSON.stringify(ids));
    };

    const markRead = async (id: string) => {
      if (!recipientId) return;
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("recipient_id", recipientId);
    };

    const notify = (item: NotificationRow) => {
      if (typeof window === "undefined") return;
      if (!window.Notification || Notification.permission !== "granted") return;
      if (!areAlertsEnabled()) return;

      const browserNotification = new Notification(item.title || "News update", {
        body: item.body,
        icon: "/images/logo.png",
        badge: "/images/logo.png",
        tag: `news-${item.id}`,
      });

      browserNotification.onclick = () => {
        window.focus();
        window.location.href = item.href;
        void markRead(item.id);
        browserNotification.close();
      };
    };

    const maybeNotify = (item: NotificationRow) => {
      if (seenIdsRef.current.has(item.id)) return;
      seenIdsRef.current.add(item.id);
      notify(item);
      if (!recipientId) {
        saveGuestSeen();
      }
    };

    const pollPublicAnnouncements = async (notifyNew: boolean) => {
      if (cancelled) return;

      const { data } = await supabase
        .from("announcements")
        .select("id, slug, title, body")
        .eq("visibility", "public")
        .order("published_at", { ascending: false })
        .limit(5);

      if (!data || cancelled) return;

      const ordered = [...(data as AnnouncementRow[])].reverse();
      ordered.forEach((item) => {
        if (seenIdsRef.current.has(item.id)) return;
        seenIdsRef.current.add(item.id);

        if (notifyNew) {
          notify({
            id: item.id,
            title: item.title || "News update",
            body: item.body || "",
            href: `/newsroom/${item.slug ?? item.id}`,
          });
        }
      });

      saveGuestSeen();
    };

    const poll = async () => {
      if (!recipientId || cancelled) return;

      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, href")
        .eq("recipient_id", recipientId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!data || cancelled) return;

      const ordered = [...(data as NotificationRow[])].reverse();
      ordered.forEach((item) => {
        maybeNotify(item);
      });
    };

    const init = async () => {
      void ensurePushServiceWorker().catch(() => undefined);

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!data.session) {
        loadGuestSeen();
        await pollPublicAnnouncements(false);
        intervalId = setInterval(() => {
          void pollPublicAnnouncements(true);
        }, 12000);
        return;
      }

      recipientId = data.session.user.id;

      channel = supabase
        .channel(`browser-news-notifier-${recipientId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${recipientId}`,
          },
          (payload) => {
            const next = payload.new as Partial<NotificationRow>;
            if (!next.id || !next.href) return;
            maybeNotify({
              id: next.id,
              title: next.title ?? "News update",
              body: next.body ?? "",
              href: next.href,
            });
          }
        )
        .subscribe();

      await poll();
      intervalId = setInterval(poll, 12000);
    };

    void init();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  return null;
}
