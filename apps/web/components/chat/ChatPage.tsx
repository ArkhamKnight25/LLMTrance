"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ModelSelector } from "./ModelSelector";
import { Composer } from "./Composer";
import { Message } from "./Message";
import { ChatEmpty } from "./ChatEmpty";
import { streamChat } from "@/lib/stream-chat";
import type { Provider, UIChatMessage, ChatMessage as ApiChatMessage } from "@/types";

export function ChatPage({
  conversationId: initialConvId,
  initialMessages,
  initialTitle,
}: {
  conversationId?: string;
  initialMessages?: ApiChatMessage[];
  initialTitle?: string | null;
}) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(initialConvId ?? null);
  const [messages, setMessages] = useState<UIChatMessage[]>(() =>
    (initialMessages ?? []).map(toUI)
  );
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState<string>("gpt-4o-mini");
  const [streaming, setStreaming] = useState(false);

  const streamRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  const isEmpty = messages.length === 0;

  async function send(text: string) {
    const startedAt = Date.now();
    const userMsg: UIChatMessage = {
      id: "msg_u_" + startedAt,
      role: "user",
      content: text,
      createdAt: startedAt,
    };
    const asstMsgId = "msg_a_" + startedAt;
    const asstMsg: UIChatMessage = {
      id: asstMsgId,
      role: "assistant",
      provider,
      model,
      content: "",
      createdAt: startedAt,
      streaming: true,
      tokensIn: Math.floor(text.length / 3.2),
    };

    setMessages((cur) => [...cur, userMsg, asstMsg]);
    setStreaming(true);
    setInput("");

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      await streamChat({
        message: text,
        provider,
        model,
        conversationId,
        signal: ac.signal,
        onStart: ({ conversationId: cid, messageId }) => {
          if (!conversationId) {
            setConversationId(cid);
            // soft-update URL so refresh resumes the same conv
            window.history.replaceState(null, "", `/conversations/${cid}`);
          }
          setMessages((cur) =>
            cur.map((m) => (m.id === asstMsgId ? { ...m, id: messageId } : m))
          );
        },
        onToken: (text) => {
          setMessages((cur) => {
            const copy = [...cur];
            const last = copy[copy.length - 1];
            if (!last) return cur;
            copy[copy.length - 1] = {
              ...last,
              content: last.content + text,
              tokensOut: Math.floor((last.content.length + text.length) / 3.6),
            };
            return copy;
          });
        },
        onError: (msg) => {
          setMessages((cur) => {
            const copy = [...cur];
            const last = copy[copy.length - 1];
            if (!last) return cur;
            copy[copy.length - 1] = {
              ...last,
              streaming: false,
              cancelled: true,
              content: last.content + `\n\n_[stream error: ${msg}]_`,
            };
            return copy;
          });
        },
        onDone: ({ cancelled }) => {
          const lat = Date.now() - startedAt;
          setMessages((cur) => {
            const copy = [...cur];
            const last = copy[copy.length - 1];
            if (!last) return cur;
            copy[copy.length - 1] = {
              ...last,
              streaming: false,
              cancelled,
              latencyMs: lat,
            };
            return copy;
          });
        },
      });
    } catch (err) {
      const e = err as Error;
      if (e.name !== "AbortError") {
        setMessages((cur) => {
          const copy = [...cur];
          const last = copy[copy.length - 1];
          if (!last) return cur;
          copy[copy.length - 1] = {
            ...last,
            streaming: false,
            cancelled: true,
            content: last.content + `\n\n_[error: ${e.message}]_`,
          };
          return copy;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setMessages((cur) => {
      const copy = [...cur];
      const last = copy[copy.length - 1];
      if (!last) return cur;
      copy[copy.length - 1] = { ...last, streaming: false, cancelled: true };
      return copy;
    });
    setStreaming(false);
  }

  return (
    <div className="page page--chat">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {isEmpty ? (
          <ChatEmpty
            input={input}
            setInput={setInput}
            onSend={() => input.trim() && send(input.trim())}
            onPick={(t) => send(t)}
            provider={provider}
            model={model}
            setProvider={setProvider}
            setModel={setModel}
          />
        ) : (
          <>
            <div className="chat-header">
              <div>
                <h1 className="chat-header__title">{initialTitle ?? "Untitled conversation"}</h1>
                <div className="chat-header__sub">
                  {(conversationId ?? "conv_ephemeral").slice(0, 16)} · {messages.length} messages
                </div>
              </div>
              <ModelSelector
                provider={provider}
                model={model}
                setProvider={setProvider}
                setModel={setModel}
              />
            </div>

            <div className="chat-stream" ref={streamRef}>
              {messages.map((m) => (
                <Message key={m.id} m={m} />
              ))}
            </div>
          </>
        )}
      </div>

      {!isEmpty && (
        <Composer
          input={input}
          setInput={setInput}
          onSend={() => input.trim() && send(input.trim())}
          onCancel={cancel}
          streaming={streaming}
        />
      )}
    </div>
  );
}

function toUI(m: ApiChatMessage): UIChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    provider: m.provider ?? undefined,
    model: m.model ?? undefined,
    createdAt: new Date(m.createdAt).getTime(),
  };
}
