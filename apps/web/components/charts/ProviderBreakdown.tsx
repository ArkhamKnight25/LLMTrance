import type { ProviderBreakdownRow } from "@/types";

export function ProviderBreakdown({ data }: { data: ProviderBreakdownRow[] }) {
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
        no provider data yet
      </div>
    );
  }
  const totalReq = data.reduce((s, d) => s + d.requests, 0);
  const totalErr = data.reduce((s, d) => s + d.errors, 0);
  const max = Math.max(...data.map((d) => d.requests), 1);

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.map((d) => {
          const pct = totalReq ? (d.requests / totalReq) * 100 : 0;
          const errPct = d.requests ? (d.errors / d.requests) * 100 : 0;
          const w = (d.requests / max) * 100;
          return (
            <div key={d.provider + "/" + d.model}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      background: d.provider === "openai" ? "var(--ink)" : "#7f5af0",
                      display: "inline-block",
                    }}
                  />
                  <span className="mono" style={{ fontSize: 12 }}>
                    {d.provider}/{d.model}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                  {d.requests.toLocaleString()}
                  <span style={{ color: "var(--ink-5)" }}> · {pct.toFixed(1)}%</span>
                  {" · "}
                  <span style={{ color: d.errors > 25 ? "var(--err)" : "var(--ink-3)" }}>
                    {errPct.toFixed(2)}% err
                  </span>
                </div>
              </div>
              <div
                style={{
                  position: "relative",
                  height: 10,
                  background: "var(--surface-2)",
                  border: "1px solid var(--rule-softer)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: w + "%",
                    background: "var(--ink)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: ((max - d.requests) / max) * 100 + "%",
                    top: 0,
                    bottom: 0,
                    width: Math.max(2, (d.errors / max) * 100) + "%",
                    background: "var(--accent)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="mono"
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: "1px solid var(--rule-softer)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--ink-3)",
        }}
      >
        <span>
          Σ requests <b style={{ color: "var(--ink)" }}>{totalReq.toLocaleString()}</b>
        </span>
        <span>
          Σ errors <b style={{ color: "var(--err)" }}>{totalErr}</b>
        </span>
        <span>
          err rate{" "}
          <b style={{ color: "var(--ink)" }}>
            {totalReq ? ((totalErr / totalReq) * 100).toFixed(2) : "0.00"}%
          </b>
        </span>
      </div>
    </div>
  );
}
