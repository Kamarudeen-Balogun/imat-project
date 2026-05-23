"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";

type SiteStats = {
  reported: number;
  underAssessment: number;
  resolved: number;
  activeMembers: number;
};

const DEFAULT_STATS: SiteStats = {
  reported: 0,
  underAssessment: 0,
  resolved: 0,
  activeMembers: 0,
};

function normalizeStats(data: Partial<SiteStats>): SiteStats {
  return {
    reported: Number(data.reported ?? 0),
    underAssessment: Number(data.underAssessment ?? 0),
    resolved: Number(data.resolved ?? 0),
    activeMembers: Number(data.activeMembers ?? 0),
  };
}

async function loadBrowserStats() {
  const supabase = createSupabaseClient();

  const [reportedResult, underAssessmentResult, resolvedResult, activeMembersResult] = await Promise.all([
    supabase.from("defects").select("id", { count: "exact", head: true }),
    supabase.from("defects").select("id", { count: "exact", head: true }).in("status", ["assessed", "escalated"]),
    supabase.from("defects").select("id", { count: "exact", head: true }).eq("status", "resolved"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const firstError = reportedResult.error ?? underAssessmentResult.error ?? resolvedResult.error ?? activeMembersResult.error;

  if (firstError) {
    throw firstError;
  }

  return normalizeStats({
    reported: reportedResult.count ?? 0,
    underAssessment: underAssessmentResult.count ?? 0,
    resolved: resolvedResult.count ?? 0,
    activeMembers: activeMembersResult.count ?? 0,
  });
}

export function useSiteStats(refreshIntervalMs = 30000) {
  const [stats, setStats] = useState<SiteStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setStats(await loadBrowserStats());
    } catch (browserError) {
      try {
        const response = await fetch("/api/site-stats", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load site stats (${response.status})`);
        }

        const data = (await response.json()) as SiteStats;
        setStats(normalizeStats(data));
      } catch (apiError) {
        console.error("Failed to fetch site stats.", { browserError, apiError });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchStats();
      }
    };

    window.addEventListener("focus", fetchStats);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const intervalId = window.setInterval(() => {
      void fetchStats();
    }, refreshIntervalMs);

    return () => {
      window.removeEventListener("focus", fetchStats);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [fetchStats, refreshIntervalMs]);

  return { stats, loading, refreshStats: fetchStats };
}
