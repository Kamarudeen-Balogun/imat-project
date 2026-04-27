"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import {
  disableBrowserPushNotifications,
  enableBrowserPushNotifications,
  isPushNotificationSupported,
} from "@/lib/push/client";
import { BellRing, Check, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";

const ALERTS_STORAGE_KEY = "imat_news_alerts_enabled";

export default function NewsroomNotificationSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem(ALERTS_STORAGE_KEY);
        if (stored === "true" || stored === "false") {
          setEnabled(stored === "true");
        }
      }

      const supabase = createSupabaseClient();
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("notifications_enabled")
        .eq("id", data.session.user.id)
        .single();

      const profileEnabled = Boolean(profile?.notifications_enabled);
      setEnabled(profileEnabled);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ALERTS_STORAGE_KEY, String(profileEnabled));
      }
      setLoading(false);
    };

    void init();
  }, []);

  const toggle = async () => {
    const supabase = createSupabaseClient();
    const { data } = await supabase.auth.getSession();

    const willEnable = !enabled;
    const previousEnabled = enabled;

    if (willEnable && !isPushNotificationSupported()) {
      toast.error("This browser does not support push notifications.");
      return;
    }

    setEnabled(willEnable);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ALERTS_STORAGE_KEY, String(willEnable));
    }

    let profileUpdated = false;

    try {
      if (willEnable && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          throw new Error("Browser notification permission was not granted.");
        }
      }

      if (willEnable && typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied") {
        throw new Error("Browser notifications are blocked. Please allow them in browser settings.");
      }

      if (data.session) {
        const { error } = await supabase
          .from("users")
          .update({ notifications_enabled: willEnable })
          .eq("id", data.session.user.id);

        if (error) {
          throw new Error("Could not save your notification preference.");
        }

        profileUpdated = true;
      }

      if (willEnable) {
        await enableBrowserPushNotifications();
      } else {
        await disableBrowserPushNotifications();
      }

      toast.success(willEnable ? "News alerts enabled on this browser." : "News alerts turned off.");
      return;
    } catch (error) {
      if (willEnable) {
        await disableBrowserPushNotifications().catch(() => undefined);
      }

      if (data.session && profileUpdated) {
        await supabase
          .from("users")
          .update({ notifications_enabled: previousEnabled })
          .eq("id", data.session.user.id);
      }

      setEnabled(previousEnabled);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ALERTS_STORAGE_KEY, String(previousEnabled));
      }

      const message = error instanceof Error ? error.message : "Could not update your notification preference.";
      toast.error(message);
    }
  };

  if (loading) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
        enabled
          ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/15"
          : "border-borderDark bg-bg2 text-textDefault hover:border-cyan-400/40 hover:text-cyan-300"
      }`}
    >
      {enabled ? <Check size={16} /> : <BellRing size={16} />}
      {enabled ? "News alerts on" : "Enable news alerts"}
      <Sparkles size={14} className="opacity-80" />
    </button>
  );
}
