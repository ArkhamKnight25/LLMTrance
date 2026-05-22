import { Queue } from "bullmq";
import { INFERENCE_LOG_QUEUE } from "@llmtrace/shared";
import { makeRedis } from "./redis.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redisConnection = makeRedis(REDIS_URL);

export const inferenceLogQueue = new Queue(INFERENCE_LOG_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { age: 3600, count: 5000 },
    removeOnFail: { age: 86400 },
  },
});
