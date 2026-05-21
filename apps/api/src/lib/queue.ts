import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { INFERENCE_LOG_QUEUE } from "@llmtrace/shared";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const inferenceLogQueue = new Queue(INFERENCE_LOG_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { age: 3600, count: 5000 },
    removeOnFail: { age: 86400 },
  },
});
