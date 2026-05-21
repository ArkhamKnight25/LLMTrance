import type { FastifyInstance } from "fastify";
import { InferenceLogPayloadSchema, INFERENCE_LOG_QUEUE } from "@llmtrace/shared";
import { inferenceLogQueue } from "../lib/queue.js";
import { prisma } from "../lib/prisma.js";

const REQUIRE_KEY = !!process.env.INGESTION_API_KEY;

export async function registerIngestRoutes(app: FastifyInstance) {
  app.post("/api/ingest/logs", async (req, reply) => {
    if (REQUIRE_KEY) {
      const key = req.headers["x-api-key"];
      if (key !== process.env.INGESTION_API_KEY) {
        reply.code(401);
        return { error: "unauthorized" };
      }
    }

    const parsed = InferenceLogPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      try {
        await prisma.ingestionError.create({
          data: {
            errorType: "validation",
            errorMessage: JSON.stringify(parsed.error.flatten()),
            rawPayload: req.body as object,
          },
        });
      } catch {
        // best effort
      }
      reply.code(400);
      return { error: "invalid_payload", issues: parsed.error.flatten() };
    }

    await inferenceLogQueue.add(INFERENCE_LOG_QUEUE, parsed.data, {
      jobId: parsed.data.requestId,
    });

    reply.code(202);
    return { status: "accepted", requestId: parsed.data.requestId };
  });
}
