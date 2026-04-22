import { z } from "zod";

export const MemoryTierSchema = z.enum(["working", "episodic", "semantic"]);

export const ConversationMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1),
  timestamp: z.string().datetime().optional(),
});

export const MemoryFactSchema = z.object({
  id: z.string().min(1),
  tier: MemoryTierSchema,
  text: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0.8),
  tags: z.array(z.string()).default([]),
  sourceMessageIndexes: z.array(z.number().int().nonnegative()).default([]),
});

export const MemorySnapshotSchema = z.object({
  topic: z.string().min(1),
  summary: z.string().min(1),
  openQuestions: z.array(z.string()).default([]),
  nextActions: z.array(z.string()).default([]),
  facts: z.array(MemoryFactSchema).default([]),
  updatedAt: z.string().datetime(),
});

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type MemoryFact = z.infer<typeof MemoryFactSchema>;
export type MemorySnapshot = z.infer<typeof MemorySnapshotSchema>;

export function buildRecentMessageWindow(messages: ConversationMessage[], maxMessages = 18): ConversationMessage[] {
  if (messages.length <= maxMessages) {
    return messages;
  }

  return messages.slice(messages.length - maxMessages);
}

export function normalizeMemorySnapshot(snapshot: MemorySnapshot): MemorySnapshot {
  return MemorySnapshotSchema.parse({
    ...snapshot,
    updatedAt: snapshot.updatedAt || new Date().toISOString(),
    facts: snapshot.facts.map((fact) => ({
      ...fact,
      tags: Array.from(new Set(fact.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))),
    })),
  });
}

export function createMemoryPromptInput(topic: string, messages: ConversationMessage[], existingFacts: MemoryFact[] = []): string {
  const recent = buildRecentMessageWindow(messages);

  const renderedMessages = recent
    .map((message, index) => `${index + 1}. [${message.role}] ${message.content}`)
    .join("\n");

  const renderedFacts = existingFacts.length
    ? existingFacts.map((fact) => `- (${fact.tier}) ${fact.text}`).join("\n")
    : "- none";

  return [
    `Topic: ${topic}`,
    "",
    "Recent conversation window:",
    renderedMessages,
    "",
    "Known memory facts:",
    renderedFacts,
    "",
    "Return structured JSON with keys:",
    "summary, openQuestions, nextActions, facts[].",
    "Each fact must include tier in [working, episodic, semantic].",
  ].join("\n");
}
