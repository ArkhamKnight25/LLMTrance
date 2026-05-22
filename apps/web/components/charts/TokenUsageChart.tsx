"use client";

import { useEffect, useRef, useState } from "react";
import { EmptyChart } from "./ThroughputChart";
import { shortModel } from "@/lib/format";
import type { ProviderBreakdownRow } from "@/types";

export function TokenUsageChart({
  data,
  height = 220,
}: {
  data: ProviderBreakdownRow[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(560);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  if (data.length === 0) return <EmptyChart height={height} label="no token data" />;

  const padL = 12;
  const padR = 12;
  const padT = 10;
  const padB = 56;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;
  const maxV = Math.max(...data.map((d) => d.inputTokens + d.outputTokens), 1);

  const colW = innerW / data.length;
  const bw = colW * 0.5;

  return (
    <div ref={ref} style={{ width: "100%", height }}>
      <svg viewBox={`0 0 ${w} ${height}`} className="chart-svg" preserveAspectRatio="none">
        {[0, 0.5, 1].map((t) => {
          const y = padT + innerH - t * innerH;
          return (
            <line key={t} x1={padL} y1={y} x2={padL + innerW} y2={y} className="grid-line" />
          );
        })}
        {data.map((d, i) => {
          const x = padL + i * colW + (colW - bw) / 2;
          const total = d.inputTokens + d.outputTokens;
          const hT = (total / maxV) * innerH;
          const hOut = (d.outputTokens / maxV) * innerH;
          return (
            <g key={d.model + i}>
              <rect x={x} y={padT + innerH - hT} width={bw} height={hT - hOut} fill="var(--ink)" />
              <rect
                x={x}
                y={padT + innerH - hOut}
                width={bw}
                height={hOut}
                fill="var(--accent)"
              />
              <text x={x + bw / 2} y={padT + innerH + 14} textAnchor="middle" className="axis-tick">
                {shortModel(d.model)}
              </text>
              <text
                x={x + bw / 2}
                y={padT + innerH + 26}
                textAnchor="middle"
                className="axis-tick"
                opacity="0.6"
              >
                {(total / 1000).toFixed(1)}k tok
              </text>
            </g>
          );
        })}
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
