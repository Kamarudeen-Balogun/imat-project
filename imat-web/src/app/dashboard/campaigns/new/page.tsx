import { createSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CampaignForm from "./CampaignForm";

export default async function NewCampaignPage() {
  const supabase = await createSupabaseClient();
  
  // Verify user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Get user role for authorization
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const allowedRoles = ["advocacy_officer", "president", "admin"];
  
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect("/dashboard"); // Kick out unauthorized users
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-textDefault">Broadcast & Campaigns</h1>
        <p className="text-text2 mt-2">
          Publish public news, university maintenance announcements, or internal member updates.
        </p>
      </div>

      <div className="bg-bg2 border border-borderDark rounded-2xl p-6 md:p-8">
        <CampaignForm userId={user.id} />
      </div>
    </div>
  );
}
