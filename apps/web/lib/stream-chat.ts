import { apiBase } from "./api-base";

export interface StreamChatParams {
  message: string;
  provider: "openai" | "anthropic";
  model: string;
  conversationId?: string | null;
  signal?: AbortSignal;
  onStart?: (data: { conversationId: string; messageId: string }) => void;
  onToken?: (text: string) => void;
  onError?: (message: string) => void;
  onDone?: (data: { messageId: string; cancelled: boolean }) => void;
}

/**
 * Reads an SSE stream from POST /api/chat/stream.
 * SSE frames are separated by a blank line; events have `event:` and `data:` fields.
 */
export async function streamChat(p: StreamChatParams): Promise<void> {
  const res = await fetch(`${apiBase()}/api/chat/stream`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify({
      message: p.message,
      provider: p.provider,
      model: p.model,
      conversationId: p.conversationId ?? undefined,
    }),
    signal: p.signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`chat_stream_failed ${res.status}: ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buf.indexOf("\n\n")) !== -1) {
        const raw = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        if (!raw.trim()) continue;

        let event = "message";
        let data = "";
        for (const line of raw.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
        }
        if (!data) continue;

        let parsed: any;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }
        if (event === "start") p.onStart?.(parsed);
        else if (event === "token") p.onToken?.(parsed.text ?? "");
        else if (event === "error") p.onError?.(parsed.message ?? "unknown error");
        else if (event === "done") p.onDone?.(parsed);
      }
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    throw err;
  }
}
