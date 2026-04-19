import type { SupabaseClient } from "@supabase/supabase-js";

type ActivityEventInput = {
  eventType: string;
  entityType: string;
  entityId?: string | null;
  title: string;
  actorId: string;
  details?: Record<string, unknown>;
  isRelevant?: boolean;
};

export async function logActivityEvent(
  supabase: SupabaseClient,
  input: ActivityEventInput
) {
  const { error } = await supabase.from("activity_logs").insert({
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    title: input.title,
    actor_id: input.actorId,
    details: input.details ?? {},
    is_relevant: input.isRelevant ?? false,
  });

  // Keep core flows resilient: activity logging failures should not block the main action.
  if (error) {
    console.warn("activity log insert failed", error.message);
  }
}
