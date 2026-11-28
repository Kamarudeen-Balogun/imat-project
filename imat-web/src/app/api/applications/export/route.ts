import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminOrOwner } from "@/lib/access";
import { enforceRateLimit } from "@/lib/serverRateLimit";

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const realIp = request.headers.get("x-real-ip") || "";
  return forwardedFor.split(",")[0]?.trim() || realIp.trim() || "unknown";
}

// RFC 4180 field escaping: wrap in double quotes when the value contains
// a comma, quote or newline, and double any quotes inside.
function csvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatCgpaAbove3(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value ? "Yes" : "No";
}

// Download every application as a CSV. Owner/admin ONLY — the file holds
// applicants' personal data in bulk. Any other signed-in member gets 403.
// Optional date-range filter on submitted date: ?from=YYYY-MM-DD&to=YYYY-MM-DD.
// No filter set = every application, all statuses, all time. Rows are
// sorted by submitted date, newest first.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (from !== null && !datePattern.test(from)) {
    return NextResponse.json(
      { error: "Invalid 'from' date. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }
  if (to !== null && !datePattern.test(to)) {
    return NextResponse.json(
      { error: "Invalid 'to' date. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }
  if (from && to && from > to) {
    return NextResponse.json(
      { error: "'from' date must be on or before the 'to' date." },
      { status: 400 }
    );
  }

  // "to" is inclusive of the whole day: filter below the next midnight.
  const toExclusive =
    to === null
      ? null
      : new Date(new Date(`${to}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

  const ip = getClientIp(request);
  const rateLimit = await enforceRateLimit(
    `applications-export:${ip}`,
    10,
    60 * 1000
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const callerRole = profile?.role ?? null;

  if (!isAdminOrOwner(callerRole)) {
    return NextResponse.json(
      { error: "Only the owner and admins can download applications." },
      { status: 403 }
    );
  }

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("applications")
    .select(
      "applicant_name, email, phone, matric_no, level, department, cgpa_above_3, role_preference_1, role_preference_2, role_preference_3, motivation_statement, status, created_at, reviewed_at, review_notes"
    )
    .order("created_at", { ascending: false });

  if (from) {
    query = query.gte("created_at", `${from}T00:00:00Z`);
  }
  if (toExclusive) {
    query = query.lt("created_at", `${toExclusive}T00:00:00Z`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Export applications API error.");
    return NextResponse.json(
      { error: "Could not export applications." },
      { status: 500 }
    );
  }

  const headers = [
    "Name",
    "Email",
    "Phone",
    "Matric number",
    "Level",
    "Department",
    "CGPA above 3.00",
    "Role preference 1",
    "Role preference 2",
    "Role preference 3",
    "Motivation",
    "Status",
    "Submitted date",
    "Reviewed date",
    "Reviewer notes",
  ];

  const rows = (data ?? []).map((app) => {
    const fields = [
      app.applicant_name,
      app.email,
      app.phone,
      app.matric_no,
      app.level,
      app.department,
      formatCgpaAbove3(app.cgpa_above_3),
      app.role_preference_1,
      app.role_preference_2,
      app.role_preference_3,
      app.motivation_statement,
      app.status,
      formatDate(app.created_at),
      formatDate(app.reviewed_at),
      app.review_notes,
    ];
    return fields.map(csvField).join(",");
  });

  // UTF-8 BOM so Excel opens the file with the right encoding.
  const csv = "\uFEFF" + [headers.map(csvField).join(","), ...rows].join("\r\n");
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="imat-applications-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
