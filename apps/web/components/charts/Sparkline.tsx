import { linePath } from "./helpers";

export function Sparkline({
  values,
  width = 64,
  height = 18,
  color = "currentColor",
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!values || values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rng = Math.max(1, max - min);
  const points: [number, number][] = values.map((v, i) => [
    (i / Math.max(1, values.length - 1)) * width,
    height - ((v - min) / rng) * (height - 2) - 1,
  ]);
  return (
    <svg width={width} height={height} className="chart-svg">
      <path d={linePath(points)} stroke={color} strokeWidth="1" fill="none" />
    </svg>
  );
}
