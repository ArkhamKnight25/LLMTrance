import type { ConversationStatus } from "@/types";

const COLORS: Record<string, string> = {
  active: "var(--accent)",
  completed: "var(--ink-4)",
  cancelled: "var(--warn)",
  error: "var(--err)",
};

export function StatusDot({ status }: { status: ConversationStatus | string }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        background: COLORS[status] ?? "var(--ink-4)",
        display: "inline-block",
        flex: "none",
      }}
    />
  );
}
