import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// List all applications for the members' applications page. Any signed-in
// member may read the list (view-only); accept/reject stays owner/admin
// and is enforced in the accept/reject routes. The read goes through the
// service-role client because the applications RLS policies only let
// reviewers read all rows — regular members would otherwise see nothing.
export async function GET() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("List applications API error.");
    return NextResponse.json(
      { error: "Could not load applications." },
      { status: 500 }
    );
  }

  return NextResponse.json({ applications: data ?? [] });
}
