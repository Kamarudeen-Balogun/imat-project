"use server";

import { createSupabaseClient } from "@/lib/supabase/server";

/**
 * Mark notifications read for the signed-in member only. These run through
 * the user-scoped client, so RLS applies, and every write is additionally
 * scoped to recipient_id = the caller — a member can never mark someone
 * else's notifications read.
 */

export async function markNotificationRead(notificationId: string) {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !notificationId) return { ok: false };

  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", user.id);

  return { ok: true };
}

export async function markAllNotificationsRead() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  return { ok: true };
}
