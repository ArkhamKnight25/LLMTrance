import { z } from "zod";

export const ProviderEnum = z.enum(["openai", "anthropic"]);
export type Provider = z.infer<typeof ProviderEnum>;

export const ConversationStatusEnum = z.enum([
  "active",
  "completed",
  "cancelled",
  "error",
]);
export type ConversationStatus = z.infer<typeof ConversationStatusEnum>;

export const InferenceStatusEnum = z.enum(["success", "error", "cancelled"]);
export type InferenceStatus = z.infer<typeof InferenceStatusEnum>;

export const ConversationCreateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
});
export type ConversationCreate = z.infer<typeof ConversationCreateSchema>;

export const ConversationUpdateSchema = z.object({
  status: ConversationStatusEnum.optional(),
  title: z.string().min(1).max(500).optional(),
});
export type ConversationUpdate = z.infer<typeof ConversationUpdateSchema>;

export const ChatStreamRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(32000),
  provider: ProviderEnum.default("openai"),
  model: z.string().min(1).default("gpt-4o-mini"),
});
export type ChatStreamRequest = z.infer<typeof ChatStreamRequestSchema>;

export const InferenceLogPayloadSchema = z.object({
  requestId: z.string().min(1).max(128),
  conversationId: z.string().uuid().optional().nullable(),
  provider: ProviderEnum,
  model: z.string().min(1).max(200),
  status: InferenceStatusEnum,
  latencyMs: z.number().int().nonnegative().optional().nullable(),
  inputTokens: z.number().int().nonnegative().optional().nullable(),
  outputTokens: z.number().int().nonnegative().optional().nullable(),
  totalTokens: z.number().int().nonnegative().optional().nullable(),
  inputPreview: z.string().max(2000).optional().nullable(),
  outputPreview: z.string().max(2000).optional().nullable(),
  errorMessage: z.string().max(4000).optional().nullable(),
  errorType: z.string().max(120).optional().nullable(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});
export type InferenceLogPayload = z.infer<typeof InferenceLogPayloadSchema>;

export const MetricsRangeSchema = z.enum(["15m", "1h", "6h", "24h", "7d"]);
export type MetricsRange = z.infer<typeof MetricsRangeSchema>;
