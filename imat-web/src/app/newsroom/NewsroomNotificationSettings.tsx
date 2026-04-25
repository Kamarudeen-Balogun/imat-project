"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
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
    setEnabled(willEnable);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ALERTS_STORAGE_KEY, String(willEnable));
    }

    if (willEnable && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEnabled(false);
        window.localStorage.setItem(ALERTS_STORAGE_KEY, "false");
        toast.error("Browser notification permission was not granted.");
        return;
      }
    }

    if (willEnable && typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied") {
      setEnabled(false);
      window.localStorage.setItem(ALERTS_STORAGE_KEY, "false");
      toast.error("Browser notifications are blocked. Please allow them in browser settings.");
      return;
    }

    if (!data.session) {
      toast.success(willEnable ? "News alerts enabled on this browser." : "News alerts turned off on this browser.");
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({ notifications_enabled: willEnable })
      .eq("id", data.session.user.id);

    if (error) {
      setEnabled(!willEnable);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ALERTS_STORAGE_KEY, String(!willEnable));
      }
      toast.error("Could not save your notification preference.");
      return;
    }

    toast.success(willEnable ? "News alerts enabled on this browser." : "News alerts turned off.");
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
