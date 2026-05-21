import { apiBase } from "./api-base";
import type {
  ChatMessage,
  Conversation,
  DashboardSummary,
  ProviderBreakdownRow,
  RecentInferenceLog,
  TimeseriesPoint,
} from "@/types";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`api_error ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  listConversations: () =>
    req<{ conversations: Conversation[] }>("/api/conversations"),
  createConversation: (title?: string) =>
    req<Conversation>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  getMessages: (id: string) =>
    req<{ messages: ChatMessage[] }>(`/api/conversations/${id}/messages`),
  updateConversation: (id: string, body: Partial<{ status: string; title: string }>) =>
    req<Conversation>(`/api/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  metricsSummary: (range = "24h") =>
    req<DashboardSummary>(`/api/metrics/summary?range=${range}`),
  metricsTimeseries: (range = "1h") =>
    req<{ points: TimeseriesPoint[] }>(
      `/api/metrics/timeseries?range=${range}`
    ),
  metricsProviders: (range = "24h") =>
    req<{ rows: ProviderBreakdownRow[] }>(
      `/api/metrics/providers?range=${range}`
    ),
  recentLogs: (limit = 25) =>
    req<{ logs: RecentInferenceLog[] }>(
      `/api/inference-logs/recent?limit=${limit}`
    ),
};
