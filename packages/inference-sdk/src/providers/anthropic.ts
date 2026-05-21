import Anthropic from "@anthropic-ai/sdk";
import type {
  CompleteParams,
  CompleteResult,
  ProviderAdapter,
  StreamEvent,
  StreamParams,
} from "../types.js";

function splitSystem(messages: CompleteParams["messages"]) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const rest = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  return { system: system || undefined, rest };
}

export class AnthropicProvider implements ProviderAdapter {
  readonly provider = "anthropic" as const;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(params: CompleteParams): Promise<CompleteResult> {
    const { system, rest } = splitSystem(params.messages);
    const res = await this.client.messages.create(
      {
        model: params.model,
        system,
        messages: rest,
        max_tokens: params.maxTokens ?? 1024,
        temperature: params.temperature,
      },
      { signal: params.signal }
    );
    const content = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    const usage = {
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      totalTokens: res.usage.input_tokens + res.usage.output_tokens,
    };
    return { content, usage };
  }

  async *stream(params: StreamParams): AsyncIterable<StreamEvent> {
    const { system, rest } = splitSystem(params.messages);
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const stream = await this.client.messages.stream(
        {
          model: params.model,
          system,
          messages: rest,
          max_tokens: params.maxTokens ?? 1024,
          temperature: params.temperature,
        },
        { signal: params.signal }
      );

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield { type: "token", text: event.delta.text };
        } else if (event.type === "message_start") {
          inputTokens = event.message.usage.input_tokens;
        } else if (event.type === "message_delta") {
          outputTokens = event.usage.output_tokens;
        }
      }

      const usage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      };
      yield { type: "usage", usage };
      yield { type: "done", usage };
    } catch (err) {
      yield { type: "error", error: err as Error };
    }
  }
}
