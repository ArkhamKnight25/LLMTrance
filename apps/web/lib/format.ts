export function relTime(ts: number | string | Date): string {
  const t = typeof ts === "number" ? ts : new Date(ts).getTime();
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

export function shortModel(m: string): string {
  return m
    .replace("claude-3-5-sonnet-latest", "sonnet-3.5")
    .replace("gpt-4o-mini", "4o-mini")
    .replace("gpt-4o", "4o")
    .replace("gpt-4.1", "4.1");
}

export function formatTime(d: Date | string | number): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
