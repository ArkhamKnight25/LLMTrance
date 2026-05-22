import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { redisConnection } from "../lib/queue.js";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

export async function registerHealthRoute(app: FastifyInstance) {
  // Fast readiness probe for platform health checks (Render, k8s).
  // Always returns 200 once the process is up.
  app.get("/healthz", async () => ({ ok: true }));

  // Full diagnostic; each dep check has a 3s ceiling so the route can never
  // exceed Render's default health timeout.
  app.get("/health", async () => {
    const checks: Record<string, string> = { api: "ok" };
    try {
      await withTimeout(prisma.$queryRaw`SELECT 1` as Promise<unknown>, 3000);
      checks.postgres = "ok";
    } catch {
      checks.postgres = "down";
    }
    try {
      const r = await withTimeout(redisConnection.ping(), 3000);
      checks.redis = r === "PONG" ? "ok" : "degraded";
    } catch {
      checks.redis = "down";
    }
    const allOk = Object.values(checks).every((v) => v === "ok");
    return { status: allOk ? "ok" : "degraded", checks, time: new Date().toISOString() };
  });
}
