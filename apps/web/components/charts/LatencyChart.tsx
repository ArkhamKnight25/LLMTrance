"use client";

import { useEffect, useRef, useState } from "react";
import { linePath } from "./helpers";
import { EmptyChart } from "./ThroughputChart";
import type { TimeseriesPoint } from "@/types";

export function LatencyChart({
  data,
  height = 220,
}: {
  data: TimeseriesPoint[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  if (data.length === 0) return <EmptyChart height={height} label="no latency data" />;

  const padL = 44;
  const padR = 14;
  const padT = 10;
  const padB = 22;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;
  const maxV =
    Math.max(...data.map((d) => Math.max(d.p95LatencyMs, d.avgLatencyMs, d.p50LatencyMs)), 1) *
    1.05;

  const xAt = (i: number) =>
    padL + (i / Math.max(1, data.length - 1)) * innerW;
  const yAt = (v: number) => padT + innerH - (v / maxV) * innerH;

  const ptsP50: [number, number][] = data.map((d, i) => [xAt(i), yAt(d.p50LatencyMs)]);
  const ptsP95: [number, number][] = data.map((d, i) => [xAt(i), yAt(d.p95LatencyMs)]);
  const ptsAvg: [number, number][] = data.map((d, i) => [xAt(i), yAt(d.avgLatencyMs)]);

  return (
    <div ref={ref} style={{ width: "100%", height }}>
      <svg viewBox={`0 0 ${w} ${height}`} className="chart-svg" preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padT + innerH - t * innerH;
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={padL + innerW} y2={y} className="grid-line" />
              <text x={padL - 6} y={y + 3} textAnchor="end" className="axis-tick">
                {Math.round(maxV * t)}ms
              </text>
            </g>
          );
        })}
        <path d={linePath(ptsP95)} className="data-line data-line--accent" />
        <path d={linePath(ptsAvg)} className="data-line data-line--ink data-line--dashed" />
        <path d={linePath(ptsP50)} className="data-line data-line--ink" />
        <line
          x1={padL}
          y1={padT + innerH}
          x2={padL + innerW}
          y2={padT + innerH}
          className="axis-line"
        />
      </svg>
    </div>
  );
}
