import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service credentials are missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const [reportedResult, underAssessmentResult, resolvedResult, assessmentsResult, activeMembersResult] = await Promise.all([
      supabase.from("defects").select("id", { count: "exact", head: true }).eq("status", "reported"),
      supabase.from("defects").select("id", { count: "exact", head: true }).in("status", ["assessed", "escalated", "acknowledged_by_works"]),
      supabase.from("defects").select("id", { count: "exact", head: true }).eq("status", "resolved"),
      supabase.from("assessments").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

    const firstError = reportedResult.error ?? underAssessmentResult.error ?? resolvedResult.error ?? assessmentsResult.error ?? activeMembersResult.error;

    if (firstError) {
      throw firstError;
    }

    return NextResponse.json({
      reported: reportedResult.count ?? 0,
      underAssessment: underAssessmentResult.count ?? 0,
      resolved: resolvedResult.count ?? 0,
      assessmentsCompleted: assessmentsResult.count ?? 0,
      activeMembers: activeMembersResult.count ?? 0,
    });
  } catch (error) {
    console.error("Site stats API error", error);
    return NextResponse.json({ error: "Unable to load live stats." }, { status: 500 });
  }
}
