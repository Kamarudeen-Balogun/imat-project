import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SiteStatsPayload = {
  reported: number;
  underAssessment: number;
  resolved: number;
  activeMembers: number;
};

const SITE_STATS_TTL_MS = 30_000;
let siteStatsCache: { value: SiteStatsPayload; expiresAt: number } | null = null;

function createStatsClient(preferServiceRole = true) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseKey = preferServiceRole ? serviceRoleKey ?? anonKey : anonKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials are missing.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadSiteStats(preferServiceRole = true) {
  const supabase = createStatsClient(preferServiceRole);

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

  return {
    reported: reportedResult.count ?? 0,
    underAssessment: underAssessmentResult.count ?? 0,
    resolved: resolvedResult.count ?? 0,
    activeMembers: activeMembersResult.count ?? 0,
  } satisfies SiteStatsPayload;
}

export async function GET() {
  try {
    if (siteStatsCache && Date.now() < siteStatsCache.expiresAt) {
      return NextResponse.json(siteStatsCache.value, {
        headers: {
          "Cache-Control": "public, max-age=15, stale-while-revalidate=45",
        },
      });
    }

    const payload = await loadSiteStats(true).catch((error) => {
      console.warn("Service-role site stats failed; retrying with public policies.", error);
      return loadSiteStats(false);
    });

    siteStatsCache = {
      value: payload,
      expiresAt: Date.now() + SITE_STATS_TTL_MS,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=15, stale-while-revalidate=45",
      },
    });
  } catch {
    console.error("Site stats API error.");
    return NextResponse.json({ error: "Unable to load live stats." }, { status: 500 });
  }
}
