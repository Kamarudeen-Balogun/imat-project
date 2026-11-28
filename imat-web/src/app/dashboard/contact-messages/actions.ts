"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function markMessageAsRead(formData: FormData) {
  const messageId = String(formData.get("message_id") ?? "").trim();
  if (!messageId) return;

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/dashboard");
  }

  // No UPDATE policy exists on contact_messages, so the update runs
  // through the service-role client after the session check above.
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("contact_messages")
      .update({ is_read: true })
      .eq("id", messageId);

    if (error) {
      console.warn("Failed to mark contact message as read.", error);
    }
  } catch (error) {
    console.warn("Failed to mark contact message as read.", error);
  }

  revalidatePath("/dashboard/contact-messages");
  redirect("/dashboard/contact-messages");
}

export async function deleteMessage(formData: FormData) {
  const messageId = String(formData.get("message_id") ?? "").trim();
  if (!messageId) return;

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  // Only the owner may delete contact messages. Anyone else is sent back
  // without deleting anything.
  if (!profile || profile.role !== "owner") {
    redirect("/dashboard/contact-messages");
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("contact_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      console.warn("Failed to delete contact message.", error);
    }
  } catch (error) {
    console.warn("Failed to delete contact message.", error);
  }

  revalidatePath("/dashboard/contact-messages");
  redirect("/dashboard/contact-messages");
}
