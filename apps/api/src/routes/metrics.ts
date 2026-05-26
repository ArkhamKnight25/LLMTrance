import type { FastifyInstance } from "fastify";
import { MetricsRangeSchema } from "@llmtrace/shared";
import { prisma } from "../lib/prisma.js";

const RANGE_MS: Record<string, number> = {
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "6h": 6 * 60 * 60_000,
  "24h": 24 * 60 * 60_000,
  "7d": 7 * 24 * 60 * 60_000,
  "all": 0,
};

function rangeFrom(
  req: { query: unknown }
): { ms: number; key: string; since: Date | null } {
  const q = req.query as { range?: string };
  const parsed = MetricsRangeSchema.safeParse(q.range ?? "24h");
  const key = parsed.success ? parsed.data : "24h";
  if (key === "all") return { ms: 0, key, since: null };
  const ms = RANGE_MS[key]!;
  return { ms, key, since: new Date(Date.now() - ms) };
}

function whereSince(since: Date | null) {
  return since ? { createdAt: { gte: since } } : {};
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length)
  );
  return sorted[idx]!;
}

export async function registerMetricsRoutes(app: FastifyInstance) {
  app.get("/api/metrics/summary", async (req) => {
    const { since } = rangeFrom(req);
    const base = whereSince(since);

    const [total, errors, latencies, tokens] = await Promise.all([
      prisma.inferenceLog.count({ where: base }),
      prisma.inferenceLog.count({
        where: { ...base, status: "error" },
      }),
      prisma.inferenceLog.findMany({
        where: { ...base, latencyMs: { not: null } },
        select: { latencyMs: true },
        take: 50_000,
      }),
      prisma.inferenceLog.aggregate({
        where: base,
        _sum: { totalTokens: true },
      }),
    ]);

    const lats = latencies.map((l) => l.latencyMs!).filter(Boolean);
    const avg = lats.length ? lats.reduce((a, b) => a + b, 0) / lats.length : 0;
    const p95 = percentile(lats, 95);

    return {
      totalRequests: total,
      successRate: total > 0 ? (total - errors) / total : 1,
      errorRate: total > 0 ? errors / total : 0,
      avgLatencyMs: Math.round(avg),
      p95LatencyMs: Math.round(p95),
      totalTokens: tokens._sum.totalTokens ?? 0,
    };
  });

  app.get("/api/metrics/timeseries", async (req) => {
    const { key, since: sinceArg } = rangeFrom(req);
    const buckets = 60;
    let windowStart: Date;
    if (sinceArg) {
      windowStart = sinceArg;
    } else {
      const oldest = await prisma.inferenceLog.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      windowStart = oldest?.createdAt ?? new Date(Date.now() - 60_000);
    }
    const now = Date.now();
    const ms = Math.max(now - windowStart.getTime(), buckets);
    const bucketMs = Math.max(1, Math.floor(ms / buckets));

    const rows = await prisma.inferenceLog.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true, status: true, latencyMs: true },
      take: 50_000,
    });

    const arr = Array.from({ length: buckets }, (_, i) => ({
      bucket: i,
      bucketStart: new Date(
        windowStart.getTime() + i * bucketMs
      ).toISOString(),
      requests: 0,
      errors: 0,
      latencies: [] as number[],
    }));

    for (const r of rows) {
      const idx = Math.min(
        buckets - 1,
        Math.floor((r.createdAt.getTime() - windowStart.getTime()) / bucketMs)
      );
      if (idx < 0) continue;
      arr[idx]!.requests++;
      if (r.status === "error") arr[idx]!.errors++;
      if (r.latencyMs != null) arr[idx]!.latencies.push(r.latencyMs);
    }

    return {
      range: key,
      bucketMs,
      points: arr.map((b) => ({
        bucket: b.bucketStart,
        requests: b.requests,
        errors: b.errors,
        avgLatencyMs: b.latencies.length
          ? Math.round(
              b.latencies.reduce((a, c) => a + c, 0) / b.latencies.length
            )
          : 0,
        p50LatencyMs: percentile(b.latencies, 50),
        p95LatencyMs: percentile(b.latencies, 95),
      })),
    };
  });

  app.get("/api/metrics/providers", async (req) => {
    const { since } = rangeFrom(req);
    const base = whereSince(since);

    const grouped = await prisma.inferenceLog.groupBy({
      by: ["provider", "model"],
      where: base,
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true },
    });

    const out = await Promise.all(
      grouped.map(async (g) => {
        const lats = await prisma.inferenceLog.findMany({
          where: {
            ...base,
            provider: g.provider,
            model: g.model,
            latencyMs: { not: null },
          },
          select: { latencyMs: true },
          take: 10_000,
        });
        const errors = await prisma.inferenceLog.count({
          where: {
            ...base,
            provider: g.provider,
            model: g.model,
            status: "error",
          },
        });
        const arr = lats.map((l) => l.latencyMs!).filter(Boolean);
        return {
          provider: g.provider,
          model: g.model,
          requests: g._count._all,
          errors,
          p50LatencyMs: percentile(arr, 50),
          p95LatencyMs: percentile(arr, 95),
          inputTokens: g._sum.inputTokens ?? 0,
          outputTokens: g._sum.outputTokens ?? 0,
        };
      })
    );

    return { rows: out };
  });

  app.get("/api/inference-logs/recent", async (req) => {
    const q = req.query as { limit?: string };
    const limit = Math.min(Math.max(Number(q.limit ?? 25), 1), 200);
    const rows = await prisma.inferenceLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return {
      logs: rows.map((r) => ({
        ...r,
        startedAt: r.startedAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });
}
