"use client";

import { useEffect, useMemo, useState } from "react";
import { FilterIcon } from "@/components/icons";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/format";
import type { RecentInferenceLog } from "@/types";

const STATUS_FILTERS: [string, string][] = [
  ["all", "All"],
  ["success", "Success"],
  ["error", "Error"],
  ["cancelled", "Cancelled"],
];

const PROVIDER_FILTERS: [string, string][] = [
  ["all", "All providers"],
  ["openai", "OpenAI"],
  ["anthropic", "Anthropic"],
];

export function LogsPage() {
  const [logs, setLogs] = useState<RecentInferenceLog[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [providerF, setProviderF] = useState<string>("all");

  async function refresh() {
    try {
      const { logs } = await api.recentLogs(200);
      setLogs(logs);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(
    () =>
      logs.filter((l) => {
        if (status !== "all" && l.status !== status) return false;
        if (providerF !== "all" && l.provider !== providerF) return false;
        return true;
      }),
    [logs, status, providerF]
  );

  return (
    <div className="convos">
      <div className="convos__hed">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            VOLUME · 04 — RAW EVENTS
          </div>
          <h1>
            Inference <em>logs.</em>
          </h1>
          <div className="convos__sub">
            {logs.length} events shown · indexed on (createdAt, provider, model, status) · JSONB
            metadata preserved
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn--ghost btn--sm"
            style={{ borderColor: "var(--rule-soft)" }}
            onClick={refresh}
          >
            <FilterIcon style={{ width: 11, height: 11 }} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="convos__filters" style={{ marginBottom: 0 }}>
          {STATUS_FILTERS.map(([k, label]) => (
            <button
              key={k}
              className={"convos__filter" + (status === k ? " active" : "")}
              onClick={() => setStatus(k)}
            >
              {label}
              <span className="count">
                {k === "all" ? logs.length : logs.filter((l) => l.status === k).length}
              </span>
            </button>
          ))}
        </div>
        <div className="convos__filters" style={{ marginBottom: 0 }}>
          {PROVIDER_FILTERS.map(([k, label]) => (
            <button
              key={k}
              className={"convos__filter" + (providerF === k ? " active" : "")}
              onClick={() => setProviderF(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <table className="tab" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th style={{ width: 100 }}>Time</th>
            <th style={{ width: 150 }}>Request ID</th>
            <th style={{ width: 80 }}>Provider</th>
            <th style={{ width: 200 }}>Model</th>
            <th style={{ width: 100 }}>Status</th>
            <th style={{ width: 80, textAlign: "right" }}>Latency</th>
            <th style={{ width: 110, textAlign: "right" }}>Tokens (in / out)</th>
            <th>Preview</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((l) => (
            <tr key={l.id}>
              <td>{formatTime(l.createdAt)}</td>
              <td style={{ color: "var(--ink-3)" }} className="mono">
                {l.requestId.slice(0, 16)}…
              </td>
              <td>{l.provider}</td>
              <td>{l.model}</td>
              <td>
                <span
                  className={
                    "status status--" +
                    (l.status === "success" ? "ok" : l.status === "error" ? "err" : "cancel")
                  }
                >
                  {l.status}
                </span>
              </td>
              <td className="num">{l.latencyMs != null ? l.latencyMs + "ms" : "—"}</td>
              <td className="num">
                {l.inputTokens ?? 0}
                <span style={{ color: "var(--ink-5)" }}> / </span>
                {l.outputTokens ?? 0}
              </td>
              <td className="preview">
                {l.errorType && (
                  <span style={{ color: "var(--err)" }}>[{l.errorType}] </span>
                )}
                {l.outputPreview ?? l.inputPreview ?? ""}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={8} style={{ color: "var(--ink-4)", textAlign: "center", padding: 40 }}>
                no inference logs match this filter
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
