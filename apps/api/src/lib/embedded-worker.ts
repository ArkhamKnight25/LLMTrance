import { Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import { INFERENCE_LOG_QUEUE, InferenceLogPayloadSchema, type InferenceLogPayload } from "@llmtrace/shared";
import { prisma } from "./prisma.js";

/**
 * Embedded BullMQ worker. Same code path as apps/worker, runs in the api
 * process when EMBED_WORKER=true (used for the Render free-tier deploy where
 * background workers aren't allowed). Locally docker-compose still runs the
 * worker as its own container.
 */
export function startEmbeddedWorker(log: { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void }) {
  const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
  const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 8);

  const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

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

  const worker = new Worker<InferenceLogPayload>(INFERENCE_LOG_QUEUE, processJob, {
    connection,
    concurrency: CONCURRENCY,
  });

  worker.on("failed", async (job, err) => {
    log.error({ jobId: job?.id, requestId: job?.data?.requestId, err: err.message }, "embedded worker job failed");
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
        log.error({ err: (e as Error).message }, "failed to persist ingestion error");
      }
    }
  });

  log.info({ queue: INFERENCE_LOG_QUEUE, concurrency: CONCURRENCY }, "embedded worker started");
  return worker;
}
