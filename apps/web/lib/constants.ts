import type { Provider } from "@/types";

export const MODELS: { provider: Provider; model: string; tag?: string }[] = [
  { provider: "openai", model: "gpt-4o-mini", tag: "cheap · fast" },
  { provider: "openai", model: "gpt-4o", tag: "balanced" },
  { provider: "openai", model: "gpt-4.1", tag: "strongest" },
  { provider: "anthropic", model: "claude-3-5-sonnet-latest", tag: "reasoning" },
];

export const SUGGESTIONS = [
  "Walk me through how an event-driven LLM logging pipeline should be structured end to end.",
  "Compare Redis-backed BullMQ to Kafka for an inference log ingestion path. What changes at 10k req/s?",
  "Help me design a Postgres schema for chat messages and inference logs that supports fast latency dashboards.",
  "I have to demo cancellation of an LLM stream. What's the cleanest way to wire AbortController end to end?",
];
