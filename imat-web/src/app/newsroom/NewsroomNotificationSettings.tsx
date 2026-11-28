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

    // Ask for the browser permission BEFORE touching the saved
    // preference, so a refusal leaves everything unchanged.
    if (willEnable && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Browser notification permission was not granted.");
        return;
      }
    }

    if (willEnable && typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied") {
      toast.error("Browser notifications are blocked. Please allow them in browser settings.");
      return;
    }

    setEnabled(willEnable);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ALERTS_STORAGE_KEY, String(willEnable));
    }

    // The saved preference (email + in-app alerts) is independent of
    // browser push enrolment: a push failure must NOT roll it back,
    // or nobody could ever enable alerts on a browser where push
    // is unconfigured.
    if (data.session) {
      const { error } = await supabase
        .from("users")
        .update({ notifications_enabled: willEnable })
        .eq("id", data.session.user.id);

      if (error) {
        setEnabled(previousEnabled);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(ALERTS_STORAGE_KEY, String(previousEnabled));
        }
        toast.error("Could not save your notification preference.");
        return;
      }
    }

    if (willEnable) {
      try {
        await enableBrowserPushNotifications();
        toast.success("News alerts enabled on this browser.");
      } catch (error) {
        // Alerts stay ON: email + in-app notifications still work.
        // Only the browser pop-up enrolment failed (e.g. push is not
        // configured on the server). Say so plainly instead of
        // silently switching the preference back off.
        const message = error instanceof Error ? error.message : "Browser push could not be enabled.";
        toast.error(`News alerts are on, but browser push failed: ${message} You will still get email and in-app alerts.`);
      }
      return;
    }

    try {
      await disableBrowserPushNotifications();
    } catch {
      // Best effort only — the preference is already off.
    }
    toast.success("News alerts turned off.");
  };

  if (loading) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs sm:text-sm font-semibold transition-colors ${
        enabled
          ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
          : "border-borderDark bg-bg2 text-textDefault hover:border-primary/40 hover:text-primary"
      }`}
    >
      {enabled ? <Check size={16} /> : <BellRing size={16} />}
      {enabled ? "News alerts on" : "Enable news alerts"}
      <Sparkles size={14} className="opacity-80" />
    </button>
  );
}
