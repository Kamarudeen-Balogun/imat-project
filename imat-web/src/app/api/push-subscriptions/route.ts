import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    auth: z.string().min(1),
    p256dh: z.string().min(1),
  }),
});

const postSchema = z.object({
  browserKey: z.string().min(8).max(200),
  subscription: pushSubscriptionSchema,
});

const deleteSchema = z.object({
  browserKey: z.string().min(8).max(200),
});

function getUserAgent(request: NextRequest) {
  return request.headers.get("user-agent") || "unknown";
}

function createStoredSubscription(subscription: z.infer<typeof pushSubscriptionSchema>) {
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: {
      auth: subscription.keys.auth,
      p256dh: subscription.keys.p256dh,
    },
  };
}

function formatSupabaseErrorMessage(error: { message?: string; code?: string }) {
  if (error.code === "42P01") {
    return "Push subscriptions table is missing. Run the latest Supabase schema SQL before testing notifications.";
  }

  if (error.message) {
    return error.message;
  }

  return "Push subscription storage failed.";
}

export async function POST(request: NextRequest) {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid push subscription payload." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseClient();
    const { data } = await supabase.auth.getUser();
    const admin = createSupabaseAdminClient();

    const { error } = await admin.from("push_subscriptions").upsert(
      {
        browser_key: parsed.data.browserKey,
        user_id: data.user?.id ?? null,
        endpoint: parsed.data.subscription.endpoint,
        subscription: createStoredSubscription(parsed.data.subscription),
        is_enabled: true,
        user_agent: getUserAgent(request),
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "endpoint",
      }
    );

    if (error) {
      return NextResponse.json({ error: formatSupabaseErrorMessage(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push subscription service unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid push subscription payload." }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("push_subscriptions")
      .delete()
      .eq("browser_key", parsed.data.browserKey);

    if (error) {
      return NextResponse.json({ error: formatSupabaseErrorMessage(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push subscription service unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}