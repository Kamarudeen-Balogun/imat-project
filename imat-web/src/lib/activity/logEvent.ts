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
  const basePayload = {
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    title: input.title,
    actor_id: input.actorId,
    details: input.details ?? {},
  };

  const { error } = await supabase.from("activity_logs").insert({
    ...basePayload,
    is_relevant: input.isRelevant ?? false,
  });

  if (error && /is_relevant|schema cache/i.test(error.message)) {
    // Compatibility fallback for databases that have not yet added the is_relevant column.
    const { error: fallbackError } = await supabase.from("activity_logs").insert(basePayload);

      if (fallbackError) {
        console.warn("Activity log insert failed.");
    }
    return;
  }

  // Keep core flows resilient: activity logging failures should not block the main action.
    if (error) {
      console.warn("Activity log insert failed.");
  }
}
