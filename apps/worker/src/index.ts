import { Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import pino from "pino";
import { PrismaClient } from "@prisma/client";
import {
  INFERENCE_LOG_QUEUE,
  InferenceLogPayloadSchema,
  type InferenceLogPayload,
} from "@llmtrace/shared";

const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } },
});

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 16);

const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
const prisma = new PrismaClient();

async function processJob(job: Job<InferenceLogPayload>) {
  const parsed = InferenceLogPayloadSchema.safeParse(job.data);
  if (!parsed.success) {
    throw new Error("invalid_payload: " + JSON.stringify(parsed.error.flatten()));
  }
  const p = parsed.data;

  await prisma.inferenceLog.upsert({
    where: { requestId: p.requestId },
    create: {
      requestId: p.requestId,
      conversationId: p.conversationId ?? null,
      provider: p.provider,
      model: p.model,
      status: p.status,
      latencyMs: p.latencyMs ?? null,
      inputTokens: p.inputTokens ?? null,
      outputTokens: p.outputTokens ?? null,
      totalTokens: p.totalTokens ?? null,
      inputPreview: p.inputPreview ?? null,
      outputPreview: p.outputPreview ?? null,
      errorMessage: p.errorMessage ?? null,
      errorType: p.errorType ?? null,
      startedAt: new Date(p.startedAt),
      completedAt: p.completedAt ? new Date(p.completedAt) : null,
      metadata: (p.metadata as object | null) ?? undefined,
    },
    update: {
      status: p.status,
      latencyMs: p.latencyMs ?? null,
      inputTokens: p.inputTokens ?? null,
      outputTokens: p.outputTokens ?? null,
      totalTokens: p.totalTokens ?? null,
      outputPreview: p.outputPreview ?? null,
      errorMessage: p.errorMessage ?? null,
      errorType: p.errorType ?? null,
      completedAt: p.completedAt ? new Date(p.completedAt) : null,
      metadata: (p.metadata as object | null) ?? undefined,
    },
  });
}

const worker = new Worker<InferenceLogPayload>(
  INFERENCE_LOG_QUEUE,
  processJob,
  {
    connection,
    concurrency: CONCURRENCY,
  }
);

worker.on("active", (job) =>
  log.debug({ jobId: job.id, requestId: job.data.requestId }, "active")
);
worker.on("completed", (job) =>
  log.debug({ jobId: job.id, requestId: job.data.requestId }, "completed")
);
worker.on("failed", async (job, err) => {
  log.error(
    { jobId: job?.id, requestId: job?.data?.requestId, err },
    "job failed"
  );
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    try {
      await prisma.ingestionError.create({
        data: {
          requestId: job.data?.requestId ?? null,
          errorType: err.name || "worker_failure",
          errorMessage: err.message,
          rawPayload: job.data as object,
        },
      });
    } catch (e) {
      log.error({ err: e }, "failed to persist ingestion error");
    }
  }
});

log.info(
  { queue: INFERENCE_LOG_QUEUE, concurrency: CONCURRENCY },
  "worker started"
);

async function shutdown() {
  log.info("shutting down");
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
