import type { ProviderBreakdownRow } from "@/types";

export function LatencyByModel({ data }: { data: ProviderBreakdownRow[] }) {
  if (data.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: "center",
          color: "var(--ink-4)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          border: "1px dashed var(--rule-softer)",
        }}
      >
        no latency data yet
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.p95LatencyMs), 1) * 1.05;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {data.map((d) => {
        const p50pct = (d.p50LatencyMs / max) * 100;
        const p95pct = (d.p95LatencyMs / max) * 100;
        return (
          <div key={d.provider + "/" + d.model}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span className="mono" style={{ fontSize: 12 }}>
                {d.provider}/{d.model}
              </span>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                p50 <b style={{ color: "var(--ink)" }}>{d.p50LatencyMs}ms</b>
                <span style={{ color: "var(--ink-5)" }}> · </span>
                p95 <b style={{ color: "var(--accent)" }}>{d.p95LatencyMs}ms</b>
              </span>
            </div>
            <div
              style={{
                position: "relative",
                height: 18,
                background: "var(--surface-2)",
                borderTop: "1px solid var(--rule-softer)",
                borderBottom: "1px solid var(--rule-softer)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 8,
                  height: 2,
                  width: p95pct + "%",
                  background: "var(--accent)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: `calc(${p50pct}% - 5px)`,
                  top: 4,
                  width: 10,
                  height: 10,
                  background: "var(--ink)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: `calc(${p95pct}% - 5px)`,
                  top: 4,
                  width: 10,
                  height: 10,
                  background: "var(--accent)",
                  border: "1px solid var(--accent-ink)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
