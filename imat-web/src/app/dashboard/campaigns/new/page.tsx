import { createSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isAdminOrOwner } from "@/lib/access";
import CampaignForm from "./CampaignForm";

export default async function NewCampaignPage() {
  const supabase = await createSupabaseClient();

  // Verify user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Broadcasts are owner/admin only. (The old gate let advocacy_officer and
  // president in but locked the owner out of his own composer.)
  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !isAdminOrOwner(profile.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto w-full max-w-6xl animate-in fade-in zoom-in-95 duration-500 px-4 pb-16 pt-6 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-textDefault sm:text-3xl">Broadcast Composer</h1>
        <p className="text-text2 mt-2 max-w-2xl">
          Write a proper news post for the newsroom — headline, topic, cover image,
          rich body and video — then preview it exactly as members will see it
          before you publish or save it as a draft.
        </p>
      </div>

      <CampaignForm userId={user.id} authorName={profile.full_name ?? "IMAT Official"} />
    </div>
  );
}
