"use client";

import { useCallback, useEffect, useState } from "react";
import { Stat } from "./Stat";
import { RecentLogs } from "./RecentLogs";
import { ThroughputChart } from "@/components/charts/ThroughputChart";
import { LatencyChart } from "@/components/charts/LatencyChart";
import { TokenUsageChart } from "@/components/charts/TokenUsageChart";
import { ProviderBreakdown } from "@/components/charts/ProviderBreakdown";
import { LatencyByModel } from "@/components/charts/LatencyByModel";
import { api } from "@/lib/api";
import type {
  DashboardSummary,
  ProviderBreakdownRow,
  RecentInferenceLog,
  TimeseriesPoint,
} from "@/types";

const RANGES: [string, string][] = [
  ["15m", "15m"],
  ["1h", "1h"],
  ["6h", "6h"],
  ["24h", "24h"],
  ["7d", "7d"],
];

export function DashboardPage() {
  const [range, setRange] = useState<string>("1h");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [series, setSeries] = useState<TimeseriesPoint[]>([]);
  const [providers, setProviders] = useState<ProviderBreakdownRow[]>([]);
  const [logs, setLogs] = useState<RecentInferenceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());

  const refresh = useCallback(async () => {
    try {
      const [s, t, p, l] = await Promise.all([
        api.metricsSummary("24h"),
        api.metricsTimeseries(range),
        api.metricsProviders("24h"),
        api.recentLogs(25),
      ]);
      setSummary(s);
      setSeries(t.points);
      setProviders(p.rows);
      setLogs(l.logs);
      setUpdatedAt(Date.now());
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const reqSpark = series.map((s) => s.requests);
  const latSpark = series.map((s) => s.p50LatencyMs);
  const errSpark = series.map((s) => s.errors);
  const tokSpark = series.map((s) => s.avgLatencyMs + s.requests * 30);

  const fmtNum = (n: number) => n.toLocaleString();
  const sec = (n: number) => (n / 1000).toFixed(2);

  const updatedSecs = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));

  return (
    <div className="dash">
      <div className="dash__header">
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            VOLUME · 03 — OBSERVABILITY · UPDATED{" "}
            <span style={{ color: "var(--ink)" }}>{updatedSecs}s ago</span>
          </div>
          <h1 className="dash__hed">
            Inference, by <em>the numbers.</em>
          </h1>
          <div className="dash__dek">
            {summary
              ? `${fmtNum(summary.totalRequests)} requests over the last 24 hours · p95 latency ${sec(summary.p95LatencyMs)}s · ${(summary.errorRate * 100).toFixed(2)}% error rate.`
              : loading
                ? "Loading metrics…"
                : "No inference data yet — send a chat message to populate this dashboard."}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div className="range-tabs">
            {RANGES.map(([k, label]) => (
              <button
                key={k}
                className={range === k ? "active" : ""}
                onClick={() => setRange(k)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
            Window: last {range} · auto-refresh every 5s
          </div>
        </div>
      </div>

      <div className="stat-strip">
        <Stat
          label="Total requests"
          value={summary ? fmtNum(summary.totalRequests) : "—"}
          spark={reqSpark}
        />
        <Stat
          label="Success rate"
          value={summary ? (summary.successRate * 100).toFixed(2) : "—"}
          unit="%"
          spark={reqSpark.map((v, i) => v - (errSpark[i] ?? 0) * 4)}
        />
        <Stat
          label="Error rate"
          value={summary ? (summary.errorRate * 100).toFixed(2) : "—"}
          unit="%"
          spark={errSpark}
        />
        <Stat
          label="Avg latency"
          value={summary ? fmtNum(summary.avgLatencyMs) : "—"}
          unit="ms"
          spark={latSpark}
        />
        <Stat
          label="p95 latency"
          value={summary ? (summary.p95LatencyMs / 1000).toFixed(2) : "—"}
          unit="s"
          spark={latSpark.map((v) => v * 3)}
        />
        <Stat
          label="Total tokens"
          value={summary ? (summary.totalTokens / 1_000_000).toFixed(2) : "—"}
          unit="M"
          spark={tokSpark}
        />
      </div>

      <div className="dash__grid" style={{ gridTemplateColumns: "1fr" }}>
        <div
          className="chart-cell chart-cell--wide"
          style={{ borderBottom: "1px solid var(--rule-soft)" }}
        >
          <div className="chart-cell__hed">
            <div>
              <div className="chart-cell__title">Throughput · requests / bucket</div>
              <div
                className="mono"
                style={{ fontSize: 10.5, color: "var(--ink-4)", letterSpacing: 0.04 }}
              >
                last {range} · errors overlaid in{" "}
                <span style={{ color: "var(--accent)" }}>accent</span>
              </div>
            </div>
            <div className="legend">
              <span className="legend__item">
                <span className="legend__swatch" style={{ background: "var(--ink)" }} /> requests
              </span>
              <span className="legend__item">
                <span className="legend__swatch" style={{ background: "var(--accent)" }} /> errors
              </span>
            </div>
          </div>
          <ThroughputChart data={series} height={200} />
        </div>
      </div>

      <div className="dash__grid">
        <div className="chart-cell">
          <div className="chart-cell__hed">
            <div>
              <div className="chart-cell__title">Latency · p50 / avg / p95</div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
                milliseconds · all models combined
              </div>
            </div>
            <div className="legend">
              <span className="legend__item">
                <span
                  className="legend__swatch legend__swatch--line"
                  style={{ background: "var(--ink)" }}
                />{" "}
                p50
              </span>
              <span className="legend__item">
                <span
                  className="legend__swatch legend__swatch--line"
                  style={{ background: "var(--ink)", opacity: 0.5 }}
                />{" "}
                avg
              </span>
              <span className="legend__item">
                <span
                  className="legend__swatch legend__swatch--line"
                  style={{ background: "var(--accent)" }}
                />{" "}
                p95
              </span>
            </div>
          </div>
          <LatencyChart data={series} height={200} />
        </div>
        <div className="chart-cell">
          <div className="chart-cell__hed">
            <div>
              <div className="chart-cell__title">Token usage by model</div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
                input + output, last 24h
              </div>
            </div>
            <div className="legend">
              <span className="legend__item">
                <span className="legend__swatch" style={{ background: "var(--ink)" }} /> input
              </span>
              <span className="legend__item">
                <span className="legend__swatch" style={{ background: "var(--accent)" }} /> output
              </span>
            </div>
          </div>
          <TokenUsageChart data={providers} height={220} />
        </div>
      </div>

      <div className="dash__grid">
        <div className="chart-cell">
          <div className="chart-cell__hed">
            <div>
              <div className="chart-cell__title">Provider · model breakdown</div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
                requests share · error rate flagged on bar
              </div>
            </div>
          </div>
          <ProviderBreakdown data={providers} />
        </div>
        <div className="chart-cell">
          <div className="chart-cell__hed">
            <div>
              <div className="chart-cell__title">Latency by model</div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
                p50 (■ ink) · p95 (■ accent)
              </div>
            </div>
          </div>
          <LatencyByModel data={providers} />
        </div>
      </div>

      <RecentLogs logs={logs} onRefresh={refresh} total={summary?.totalRequests} />
    </div>
  );
}
