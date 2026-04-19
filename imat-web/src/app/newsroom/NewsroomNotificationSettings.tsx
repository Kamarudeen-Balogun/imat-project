"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { BellRing, Check, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";

export default function NewsroomNotificationSettings() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);

      const { data: profile } = await supabase
        .from("users")
        .select("notifications_enabled")
        .eq("id", data.session.user.id)
        .single();

      setEnabled(Boolean(profile?.notifications_enabled));
      setLoading(false);
    };

    void init();
  }, []);

  const toggle = async () => {
    const supabase = createSupabaseClient();
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      toast.error("Sign in to manage news notifications.");
      return;
    }

    const willEnable = !enabled;
    setEnabled(willEnable);

    if (willEnable && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEnabled(false);
        toast.error("Browser notification permission was not granted.");
        return;
      }
    }

    const { error } = await supabase
      .from("users")
      .update({ notifications_enabled: willEnable })
      .eq("id", data.session.user.id);

    if (error) {
      setEnabled(!willEnable);
      toast.error("Could not save your notification preference.");
      return;
    }

    toast.success(willEnable ? "News alerts enabled for this account." : "News alerts turned off.");
  };

  if (loading || !isAuthenticated) return null;

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
