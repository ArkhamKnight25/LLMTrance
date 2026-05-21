import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { redisConnection } from "../lib/queue.js";

export async function registerHealthRoute(app: FastifyInstance) {
  app.get("/health", async () => {
    const checks: Record<string, string> = { api: "ok" };
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.postgres = "ok";
    } catch {
      checks.postgres = "down";
    }
    try {
      const r = await redisConnection.ping();
      checks.redis = r === "PONG" ? "ok" : "degraded";
    } catch {
      checks.redis = "down";
    }
    const allOk = Object.values(checks).every((v) => v === "ok");
    return { status: allOk ? "ok" : "degraded", checks, time: new Date().toISOString() };
  });
}
