"use client";

import { useEffect, useRef } from "react";
import { ArrowUpIcon, CancelIcon } from "@/components/icons";

export function Composer({
  input,
  setInput,
  onSend,
  onCancel,
  streaming,
}: {
  input: string;
  setInput: (s: string) => void;
  onSend: () => void;
  onCancel: () => void;
  streaming: boolean;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(200, ta.scrollHeight) + "px";
  }, [input]);

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!streaming) onSend();
    }
  }

  return (
    <div className="composer">
      <div className="composer__inner">
        <div className="composer__row">
          <div className="composer__textwrap">
            <textarea
              ref={taRef}
              className="composer__textarea"
              placeholder={
                streaming
                  ? "Streaming response… cancel to send a new message"
                  : "Ask anything — every request will be logged"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={streaming}
              rows={1}
            />
            <div className="composer__hint">
              <span>
                {input.length} chars · ~{Math.ceil(input.length / 3.6)} tokens
              </span>
              <span>⏎ send · ⇧⏎ newline</span>
            </div>
          </div>

          {streaming ? (
            <button className="btn btn--danger" onClick={onCancel}>
              <CancelIcon style={{ width: 11, height: 11 }} />
              Cancel
            </button>
          ) : (
            <button className="btn" onClick={onSend} disabled={!input.trim()}>
              Send
              <ArrowUpIcon style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
