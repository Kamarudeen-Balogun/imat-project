"use client";

import { useEffect, useRef } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  href: string;
};

export default function BrowserNewsNotifier() {
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createSupabaseClient();
    let recipientId: string | null = null;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

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

      const browserNotification = new Notification(item.title || "News update", {
        body: item.body,
        icon: "/imatlogo.png",
        badge: "/imatlogo.png",
        tag: `news-${item.id}`,
      });

      browserNotification.onclick = () => {
        window.focus();
        window.location.href = item.href;
        void markRead(item.id);
        browserNotification.close();
      };
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
        if (seenIdsRef.current.has(item.id)) return;
        seenIdsRef.current.add(item.id);
        notify(item);
      });
    };

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || cancelled) return;
      recipientId = data.session.user.id;

      const { data: unreadAtBoot } = await supabase
        .from("notifications")
        .select("id")
        .eq("recipient_id", recipientId)
        .eq("is_read", false)
        .limit(30);

      (unreadAtBoot ?? []).forEach((row: { id: string }) => seenIdsRef.current.add(row.id));

      await poll();
      intervalId = setInterval(poll, 12000);
    };

    void init();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return null;
}
