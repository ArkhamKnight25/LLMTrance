import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import rateLimit from "@fastify/rate-limit";
import { registerHealthRoute } from "./routes/health.js";
import { registerConversationsRoutes } from "./routes/conversations.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerIngestRoutes } from "./routes/ingest.js";
import { registerMetricsRoutes } from "./routes/metrics.js";
import { startEmbeddedWorker } from "./lib/embedded-worker.js";

const PORT = Number(process.env.PORT ?? 3232);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV === "production"
          ? undefined
          : { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } },
    },
    disableRequestLogging: false,
    bodyLimit: 1024 * 1024 * 2,
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(sensible);
  // Global default — generous, real lid lives per-route.
  await app.register(rateLimit, {
    global: false,
    max: 600,
    timeWindow: "1 hour",
  });

  await registerHealthRoute(app);
  await registerConversationsRoutes(app);
  await registerChatRoutes(app);
  await registerIngestRoutes(app);
  await registerMetricsRoutes(app);

  app.setErrorHandler((err: unknown, _req, reply) => {
    app.log.error(err);
    const e = err as { statusCode?: number; message?: string };
    if (e.statusCode) {
      reply.status(e.statusCode).send({ error: e.message ?? "error" });
    } else {
      reply.status(500).send({ error: "internal_error" });
    }
  });

  await app.listen({ port: PORT, host: HOST });
  app.log.info(`api listening on :${PORT}`);

  if (process.env.EMBED_WORKER === "true") {
    startEmbeddedWorker(app.log);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
