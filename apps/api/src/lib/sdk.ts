import {
  AnthropicProvider,
  InferenceClient,
  OpenAIProvider,
} from "@llmtrace/inference-sdk";

const INGEST_URL = process.env.INGEST_URL ?? "http://localhost:3232";
const INGESTION_API_KEY = process.env.INGESTION_API_KEY ?? "local-dev-key";

export const inferenceClient = new InferenceClient({
  ingestUrl: INGEST_URL,
  apiKey: INGESTION_API_KEY,
  emitTimeoutMs: 1000,
  redactPreviews: true,
  previewLength: 300,
});

if (process.env.OPENAI_API_KEY) {
  inferenceClient.register(new OpenAIProvider(process.env.OPENAI_API_KEY));
}
if (process.env.ANTHROPIC_API_KEY) {
  inferenceClient.register(new AnthropicProvider(process.env.ANTHROPIC_API_KEY));
}
