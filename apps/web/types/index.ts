export type Provider = "openai" | "anthropic";
export type ConversationStatus = "active" | "completed" | "cancelled" | "error";
export type InferenceStatus = "success" | "error" | "cancelled";

export interface Conversation {
  id: string;
  title: string | null;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  provider: Provider | null;
  model: string | null;
  createdAt: string;
}

export interface RecentInferenceLog {
  id: string;
  requestId: string;
  conversationId: string | null;
  provider: Provider;
  model: string;
  status: InferenceStatus;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  inputPreview: string | null;
  outputPreview: string | null;
  errorMessage: string | null;
  errorType: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  totalRequests: number;
  successRate: number;
  errorRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  totalTokens: number;
}

export interface TimeseriesPoint {
  bucket: string;
  requests: number;
  errors: number;
  p50LatencyMs: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export interface ProviderBreakdownRow {
  provider: Provider;
  model: string;
  requests: number;
  errors: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

export interface UIChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  provider?: Provider;
  model?: string;
  createdAt: number;
  streaming?: boolean;
  cancelled?: boolean;
  latencyMs?: number;
  tokensIn?: number;
  tokensOut?: number;
}
