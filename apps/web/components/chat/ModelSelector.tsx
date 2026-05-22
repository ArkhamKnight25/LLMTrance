"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronIcon } from "@/components/icons";
import { MODELS } from "@/lib/constants";
import type { Provider } from "@/types";

export function ModelSelector({
  provider,
  model,
  setProvider,
  setModel,
}: {
  provider: Provider;
  model: string;
  setProvider: (p: Provider) => void;
  setModel: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const openai = MODELS.filter((m) => m.provider === "openai");
  const anthropic = MODELS.filter((m) => m.provider === "anthropic");

  return (
    <div className="selector" ref={ref} style={{ position: "relative" }}>
      <span className="selector__lbl">Model</span>
      <button
        className={"selector__pick" + (open ? " selector__pick--open" : "")}
        onClick={() => setOpen(!open)}
      >
        <span
          className={"selector__dot" + (provider === "anthropic" ? " selector__dot--ant" : "")}
        />
        {provider}/{model}
        <ChevronIcon style={{ width: 10, height: 10, opacity: 0.6 }} />
      </button>
      {open && (
        <div className="dropdown" style={{ top: "100%", left: 0, marginTop: 6 }}>
          <div className="dropdown__group">OpenAI</div>
          {openai.map((m) => (
            <div
              key={m.model}
              className={
                "dropdown__item" + (model === m.model ? " dropdown__item--active" : "")
              }
              onClick={() => {
                setProvider("openai");
                setModel(m.model);
                setOpen(false);
              }}
            >
              <span className="selector__dot" /> {m.model}
              {m.tag && <span className="dropdown__item-sub">{m.tag}</span>}
            </div>
          ))}
          <div className="dropdown__group">Anthropic</div>
          {anthropic.map((m) => (
            <div
              key={m.model}
              className={
                "dropdown__item" + (model === m.model ? " dropdown__item--active" : "")
              }
              onClick={() => {
                setProvider("anthropic");
                setModel(m.model);
                setOpen(false);
              }}
            >
              <span className="selector__dot selector__dot--ant" /> {m.model}
              {m.tag && <span className="dropdown__item-sub">{m.tag}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
