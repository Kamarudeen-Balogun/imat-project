import webpush from "web-push";
import { getAnnouncementHref } from "@/lib/news";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AnnouncementRow = {
  id: string;
  slug: string | null;
  title: string;
  body: string;
  visibility: "public" | "members_only";
};

type PushSubscriptionRow = {
  id: string;
  user_id: string | null;
  subscription: {
    endpoint: string;
    expirationTime: number | null;
    keys: {
      auth: string;
      p256dh: string;
    };
  };
};

type PushPayload = {
  title: string;
  body: string;
  href: string;
  announcementId: string;
  visibility: AnnouncementRow["visibility"];
};

type PushResult = {
  sent: number;
  pruned: number;
};

let pushConfigured = false;

function configureWebPush() {
  if (pushConfigured) {
    return;
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Push notification keys are not configured.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  pushConfigured = true;
}

function sanitizeNotificationBody(body: string, fallback: string) {
  return body.trim().replace(/\s+/g, " ").slice(0, 180) || fallback;
}

function isSubscriptionExpiredError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const statusCode = "statusCode" in error ? Number((error as { statusCode?: unknown }).statusCode) : NaN;
  return statusCode === 404 || statusCode === 410;
}

export async function sendAnnouncementPushNotifications(announcementId: string): Promise<PushResult> {
  configureWebPush();

  const supabase = createSupabaseAdminClient();

  const { data: announcement, error: announcementError } = await supabase
    .from("announcements")
    .select("id, slug, title, body, visibility")
    .eq("id", announcementId)
    .single();

  if (announcementError || !announcement) {
    throw new Error("Unable to load announcement for push delivery.");
  }

  const { data: eligibleUsers, error: userError } = await supabase
    .from("users")
    .select("id, role")
    .eq("status", "active")
    .eq("notifications_enabled", true);

  if (userError) {
    throw new Error("Unable to load eligible notification recipients.");
  }

  const allowedUserIds = new Set(
    (eligibleUsers ?? [])
      .filter((user) => announcement.visibility === "public" || user.role !== "applicant")
      .map((user) => user.id)
  );

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, subscription")
    .eq("is_enabled", true);

  if (subscriptionError) {
    throw new Error("Unable to load push subscriptions.");
  }

  const targets = (subscriptions ?? []).filter((row) => {
    if (row.user_id === null) {
      return announcement.visibility === "public";
    }

    return allowedUserIds.has(row.user_id);
  }) as PushSubscriptionRow[];

  if (targets.length === 0) {
    return { sent: 0, pruned: 0 };
  }

  const payload: PushPayload = {
    title: announcement.title,
    body: sanitizeNotificationBody(announcement.body, announcement.title),
    href: getAnnouncementHref(announcement.slug ?? announcement.id),
    announcementId: announcement.id,
    visibility: announcement.visibility,
  };

  let sent = 0;
  let pruned = 0;

  await Promise.allSettled(
    targets.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify(payload));
        sent += 1;
      } catch (error) {
        if (isSubscriptionExpiredError(error)) {
          pruned += 1;
          await supabase.from("push_subscriptions").delete().eq("id", row.id);
          return;
        }

        throw error;
      }
    })
  );

  return { sent, pruned };
}