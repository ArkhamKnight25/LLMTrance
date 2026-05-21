import { randomUUID } from "node:crypto";
import type {
  CompleteParams,
  CompleteResult,
  InferenceClientOptions,
  Provider,
  ProviderAdapter,
  StreamEvent,
  StreamParams,
  Usage,
} from "./types.js";
import { redactPii } from "./redact.js";

interface BaseRunOptions {
  provider: Provider;
  model: string;
  conversationId?: string | null;
  requestId?: string;
  signal?: AbortSignal;
}

export class InferenceClient {
  private adapters = new Map<Provider, ProviderAdapter>();
  private ingestUrl: string;
  private apiKey?: string;
  private emitTimeoutMs: number;
  private redact: boolean;
  private previewLength: number;

  constructor(opts: InferenceClientOptions) {
    this.ingestUrl = opts.ingestUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    this.emitTimeoutMs = opts.emitTimeoutMs ?? 1000;
    this.redact = opts.redactPreviews ?? true;
    this.previewLength = opts.previewLength ?? 300;
  }

  register(adapter: ProviderAdapter) {
    this.adapters.set(adapter.provider, adapter);
    return this;
  }

  private get(provider: Provider): ProviderAdapter {
    const a = this.adapters.get(provider);
    if (!a) throw new Error(`Provider not registered: ${provider}`);
    return a;
  }

  private preview(text: string): string {
    const trimmed = text.slice(0, this.previewLength);
    return this.redact ? redactPii(trimmed) : trimmed;
  }

  async complete(
    params: CompleteParams & BaseRunOptions
  ): Promise<CompleteResult & { requestId: string }> {
    const adapter = this.get(params.provider);
    const requestId = params.requestId ?? `req_${randomUUID()}`;
    const startedAt = new Date();
    const inputPreview = this.preview(
      params.messages.map((m) => m.content).join("\n")
    );

    try {
      const result = await adapter.complete(params);
      const completedAt = new Date();
      this.emitLogAsync({
        requestId,
        conversationId: params.conversationId ?? null,
        provider: params.provider,
        model: params.model,
        status: "success",
        latencyMs: completedAt.getTime() - startedAt.getTime(),
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        inputPreview,
        outputPreview: this.preview(result.content),
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
      });
      return { ...result, requestId };
    } catch (err) {
      const completedAt = new Date();
      const e = err as Error & { name?: string };
      const cancelled = e.name === "AbortError";
      this.emitLogAsync({
        requestId,
        conversationId: params.conversationId ?? null,
        provider: params.provider,
        model: params.model,
        status: cancelled ? "cancelled" : "error",
        latencyMs: completedAt.getTime() - startedAt.getTime(),
        inputPreview,
        errorMessage: e.message,
        errorType: e.name,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
      });
      throw err;
    }
  }

  async *stream(
    params: StreamParams & BaseRunOptions
  ): AsyncIterable<StreamEvent & { requestId: string }> {
    const adapter = this.get(params.provider);
    const requestId = params.requestId ?? `req_${randomUUID()}`;
    const startedAt = new Date();
    const inputPreview = this.preview(
      params.messages.map((m) => m.content).join("\n")
    );

    let collected = "";
    let usage: Usage | undefined;
    let errored: Error | null = null;

    try {
      for await (const ev of adapter.stream(params)) {
        if (ev.type === "token") collected += ev.text;
        if (ev.type === "usage") usage = ev.usage;
        if (ev.type === "error") errored = ev.error;
        yield { ...ev, requestId };
      }
    } catch (err) {
      errored = err as Error;
    }

    const completedAt = new Date();
    const cancelled =
      params.signal?.aborted === true ||
      (errored && (errored as Error & { name?: string }).name === "AbortError");
    const status = errored
      ? cancelled
        ? "cancelled"
        : "error"
      : "success";

    this.emitLogAsync({
      requestId,
      conversationId: params.conversationId ?? null,
      provider: params.provider,
      model: params.model,
      status,
      latencyMs: completedAt.getTime() - startedAt.getTime(),
      inputTokens: usage?.inputTokens ?? null,
      outputTokens: usage?.outputTokens ?? null,
      totalTokens: usage?.totalTokens ?? null,
      inputPreview,
      outputPreview: collected ? this.preview(collected) : null,
      errorMessage: errored?.message ?? null,
      errorType: errored?.name ?? null,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
    });
  }

  /**
   * Fire-and-forget log emission. Never throws, never blocks the caller.
   * Aborts the HTTP request after emitTimeoutMs (default 1s).
   */
  emitLogAsync(payload: Record<string, unknown>): void {
    void (async () => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), this.emitTimeoutMs);
      try {
        await fetch(`${this.ingestUrl}/api/ingest/logs`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(this.apiKey ? { "x-api-key": this.apiKey } : {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch {
        // swallow — log emission must never affect main path
      } finally {
        clearTimeout(t);
      }
    })();
  }
}
