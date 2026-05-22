import { Sparkline } from "@/components/charts/Sparkline";

export function Stat({
  label,
  value,
  unit,
  delta,
  deltaDir,
  spark,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaDir?: "up" | "down";
  spark?: number[];
}) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className="stat__value tabular">
        {value}
        {unit && <span className="stat__value-unit">{unit}</span>}
      </div>
      {delta && (
        <div
          className={
            "stat__delta " +
            (deltaDir === "up"
              ? "stat__delta--up"
              : deltaDir === "down"
                ? "stat__delta--down"
                : "")
          }
        >
          <span>{delta}</span>
        </div>
      )}
      {spark && spark.length > 0 && (
        <div className="stat__spark">
          <Sparkline values={spark} width={72} height={20} color="currentColor" />
        </div>
      )}
    </div>
  );
}
