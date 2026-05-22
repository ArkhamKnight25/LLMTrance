"use client";

import { useEffect, useRef } from "react";
import { ArrowUpIcon } from "@/components/icons";
import { SUGGESTIONS } from "@/lib/constants";
import { ModelSelector } from "./ModelSelector";
import type { Provider } from "@/types";

export function ChatEmpty({
  input,
  setInput,
  onSend,
  onPick,
  provider,
  model,
  setProvider,
  setModel,
}: {
  input: string;
  setInput: (s: string) => void;
  onSend: () => void;
  onPick: (s: string) => void;
  provider: Provider;
  model: string;
  setProvider: (p: Provider) => void;
  setModel: (m: string) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(220, Math.max(72, ta.scrollHeight)) + "px";
  }, [input]);

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="chat-empty-wrap">
      <div className="chat-empty">
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          [ new session · 00:00:00 · idle · no conv_id assigned ]
        </div>
        <h1 className="chat-empty__hed">
          the observable
          <br />
          <em>chatbot.</em>
        </h1>
        <p className="chat-empty__dek">
          every request traced. every token counted. every cancel logged. the inference log
          shows up on the dashboard the moment your message finishes.
        </p>

        <div className="empty-composer">
          <div className="empty-composer__bar">
            <span className="eyebrow">prompt &nbsp;›</span>
            <div style={{ flex: 1 }} />
            <ModelSelector
              provider={provider}
              model={model}
              setProvider={setProvider}
              setModel={setModel}
            />
          </div>
          <textarea
            ref={taRef}
            className="empty-composer__ta"
            placeholder="ask anything — your message will be sent to the selected model and logged…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
          />
          <div className="empty-composer__foot">
            <span className="mono">
              {input.length} chars · ~{Math.ceil(input.length / 3.6)} tokens · ctx 20 msgs
            </span>
            <button className="btn btn--sm" onClick={onSend} disabled={!input.trim()}>
              send <ArrowUpIcon style={{ width: 11, height: 11 }} />
            </button>
          </div>
        </div>

        <div className="eyebrow" style={{ marginTop: 28, marginBottom: 10 }}>
          or pick a starter prompt
        </div>
        <div className="suggest-grid">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} className="suggest" onClick={() => onPick(s)}>
              <span className="suggest__num">PROMPT · {String(i + 1).padStart(2, "0")}</span>
              <span className="suggest__text">{s}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
