import OpenAI from "openai";
import type {
  CompleteParams,
  CompleteResult,
  ProviderAdapter,
  StreamEvent,
  StreamParams,
} from "../types.js";

export class OpenAIProvider implements ProviderAdapter {
  readonly provider = "openai" as const;
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async complete(params: CompleteParams): Promise<CompleteResult> {
    const res = await this.client.chat.completions.create(
      {
        model: params.model,
        messages: params.messages,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        stream: false,
      },
      { signal: params.signal }
    );
    const content = res.choices[0]?.message?.content ?? "";
    const usage = {
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
      totalTokens: res.usage?.total_tokens ?? 0,
    };
    return { content, usage };
  }

  async *stream(params: StreamParams): AsyncIterable<StreamEvent> {
    const stream = await this.client.chat.completions.create(
      {
        model: params.model,
        messages: params.messages,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        stream: true,
        stream_options: { include_usage: true },
      },
      { signal: params.signal }
    );

    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;

    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (delta) yield { type: "token", text: delta };
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens ?? inputTokens;
          outputTokens = chunk.usage.completion_tokens ?? outputTokens;
          totalTokens = chunk.usage.total_tokens ?? totalTokens;
        }
      }
      const usage = { inputTokens, outputTokens, totalTokens };
      yield { type: "usage", usage };
      yield { type: "done", usage };
    } catch (err) {
      yield { type: "error", error: err as Error };
    }
  }
}
