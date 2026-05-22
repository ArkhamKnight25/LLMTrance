"use client";

import { RefreshIcon } from "@/components/icons";
import { formatTime } from "@/lib/format";
import type { RecentInferenceLog } from "@/types";

export function RecentLogs({
  logs,
  onRefresh,
  total,
}: {
  logs: RecentInferenceLog[];
  onRefresh?: () => void;
  total?: number;
}) {
  return (
    <div className="logs">
      <div className="logs__hed">
        <h2 className="logs__title">
          Recent <em>inference logs</em>
        </h2>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-3)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span>
            <span
              className="led"
              style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }}
            />
            auto-refresh on
          </span>
          <span>
            showing {logs.length}
            {total != null ? ` / ${total}` : ""}
          </span>
          <button className="icon-btn" title="Refresh" onClick={onRefresh}>
            <RefreshIcon style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>

      <table className="tab">
        <thead>
          <tr>
            <th style={{ width: 90 }}>Time</th>
            <th style={{ width: 80 }}>Provider</th>
            <th style={{ width: 200 }}>Model</th>
            <th style={{ width: 100 }}>Status</th>
            <th style={{ width: 90, textAlign: "right" }}>Latency</th>
            <th style={{ width: 90, textAlign: "right" }}>Tokens</th>
            <th style={{ width: 110 }}>Conv</th>
            <th>Preview</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td>{formatTime(l.createdAt)}</td>
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
              <td className="num">{l.totalTokens ?? 0}</td>
              <td className="mono" style={{ fontSize: 11 }}>
                {l.conversationId ? "conv_" + l.conversationId.slice(0, 5) : "—"}
              </td>
              <td className="preview">
                {l.errorType && (
                  <span style={{ color: "var(--err)" }}>{l.errorType}: </span>
                )}
                {l.outputPreview ?? l.inputPreview ?? ""}
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={8} style={{ color: "var(--ink-4)", textAlign: "center", padding: 40 }}>
                no inference logs yet — send a chat message to generate one
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
