import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canAssignRole } from "@/lib/roleHierarchy";
import { enforceRateLimit } from "@/lib/serverRateLimit";

// Roles assignable through the member role-change flow. "applicant" is not
// assignable: it is the pre-membership role, not a working member role.
// NOTE: "owner" must also exist in the public.users role CHECK constraint;
// see the owner-approvals schema migration.
const roleSchema = z.enum([
  "owner",
  "admin",
  "president",
  "vice_president",
  "technical_officer",
  "documentation_officer",
  "field_officer",
  "advocacy_officer",
  "faculty_advisor",
  "works_dept",
]);

const bodySchema = z.object({
  role: roleSchema,
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const realIp = request.headers.get("x-real-ip") || "";
  return forwardedFor.split(",")[0]?.trim() || realIp.trim() || "unknown";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsedParams = paramsSchema.safeParse({ id });
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid member id." }, { status: 400 });
  }
  const memberId = parsedParams.data.id;

  const ip = getClientIp(request);
  const rateLimit = await enforceRateLimit(`members-role:${ip}`, 20, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role payload." }, { status: 400 });
  }
  const { role } = parsed.data;

  try {
    // Authenticate the caller with the anon server client and load their
    // member role. All writes below use the service-role admin client.
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

    if (callerRole !== "owner" && callerRole !== "admin") {
      return NextResponse.json(
        { error: "Only owners and admins can change member roles." },
        { status: 403 }
      );
    }

    if (!canAssignRole(callerRole, role)) {
      return NextResponse.json(
        { error: "You cannot assign this role." },
        { status: 403 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: target, error: targetError } = await admin
      .from("users")
      .select("id, role, status")
      .eq("id", memberId)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    // Last-owner safeguard: never demote the only active owner, or the
    // workspace would be left with no owner. A no-op (owner -> owner)
    // and demoting an already-inactive owner are not blocked.
    if (target.role === "owner" && target.status === "active" && role !== "owner") {
      const { count, error: countError } = await admin
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "owner")
        .eq("status", "active");

      if (countError) {
        console.error("Change member role: failed to count active owners.");
        return NextResponse.json(
          { error: "Could not verify the owner safeguard." },
          { status: 500 }
        );
      }

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last active owner." },
          { status: 400 }
        );
      }
    }

    const { error: updateError } = await admin
      .from("users")
      .update({ role })
      .eq("id", memberId);

    if (updateError) {
      console.error("Change member role: failed to update role.");
      return NextResponse.json(
        { error: "Failed to update the member role." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    console.error("Change member role API error.");
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
