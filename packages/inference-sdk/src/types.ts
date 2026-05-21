import type { Provider as ProviderName } from "@llmtrace/shared";

export type Provider = ProviderName;

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CompleteParams {
  model: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  signal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
}

export interface StreamParams extends CompleteParams {}

export type StreamEvent =
  | { type: "token"; text: string }
  | { type: "usage"; usage: Usage }
  | { type: "done"; usage?: Usage }
  | { type: "error"; error: Error };

export interface CompleteResult {
  content: string;
  usage: Usage;
}

export interface ProviderAdapter {
  readonly provider: Provider;
  complete(params: CompleteParams): Promise<CompleteResult>;
  stream(params: StreamParams): AsyncIterable<StreamEvent>;
}

export type EmitLogFn = (payload: unknown) => void | Promise<void>;

export interface InferenceClientOptions {
  ingestUrl: string;
  apiKey?: string;
  emitTimeoutMs?: number;
  redactPreviews?: boolean;
  previewLength?: number;
}
