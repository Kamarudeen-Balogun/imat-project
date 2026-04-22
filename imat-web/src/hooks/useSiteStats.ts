"use client";

import { useCallback, useEffect, useState } from "react";

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

export function useSiteStats(refreshIntervalMs = 30000) {
  const [stats, setStats] = useState<SiteStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/site-stats", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load site stats (${response.status})`);
      }

      const data = (await response.json()) as SiteStats;
      setStats({
        reported: Number(data.reported ?? 0),
        underAssessment: Number(data.underAssessment ?? 0),
        resolved: Number(data.resolved ?? 0),
        activeMembers: Number(data.activeMembers ?? 0),
      });
    } catch (error) {
      console.error(error);
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
