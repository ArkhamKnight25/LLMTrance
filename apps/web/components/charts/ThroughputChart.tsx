"use client";

import { useEffect, useRef, useState } from "react";
import type { TimeseriesPoint } from "@/types";

export function ThroughputChart({
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

  if (data.length === 0) {
    return <EmptyChart height={height} label="no data" />;
  }

  const padL = 36;
  const padR = 12;
  const padT = 10;
  const padB = 22;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;
  const maxR = Math.max(...data.map((d) => d.requests), 1);
  const barW = innerW / data.length;

  return (
    <div ref={ref} style={{ width: "100%", height }}>
      <svg viewBox={`0 0 ${w} ${height}`} className="chart-svg" preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padT + innerH - t * innerH;
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={padL + innerW} y2={y} className="grid-line" />
              <text x={padL - 6} y={y + 3} textAnchor="end" className="axis-tick">
                {Math.round(maxR * t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = padL + i * barW;
          const h = (d.requests / maxR) * innerH;
          return (
            <rect
              key={i}
              x={x + 0.5}
              y={padT + innerH - h}
              width={Math.max(0.5, barW - 1)}
              height={h}
              fill="var(--ink)"
              opacity="0.78"
            />
          );
        })}
        {data.map((d, i) => {
          if (d.errors === 0) return null;
          const x = padL + i * barW;
          const h = (d.errors / maxR) * innerH;
          return (
            <rect
              key={i}
              x={x + 0.5}
              y={padT + innerH - h}
              width={Math.max(0.5, barW - 1)}
              height={h}
              fill="var(--accent)"
            />
          );
        })}
        <line
          x1={padL}
          y1={padT + innerH}
          x2={padL + innerW}
          y2={padT + innerH}
          className="axis-line"
        />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const x = padL + t * innerW;
          const idx = Math.min(data.length - 1, Math.floor(t * (data.length - 1)));
          const lbl = formatBucket(data[idx]!.bucket);
          return (
            <text key={t} x={x} y={height - 6} textAnchor="middle" className="axis-tick">
              {lbl}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function formatBucket(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function EmptyChart({ height, label }: { height: number; label: string }) {
  return (
    <div
      style={{
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--ink-4)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        border: "1px dashed var(--rule-softer)",
      }}
    >
      {label}
    </div>
  );
}
