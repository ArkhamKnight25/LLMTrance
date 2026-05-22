import { Redis, type RedisOptions } from "ioredis";

/**
 * Build a Redis client that works for both plain `redis://` (Docker/local) and
 * TLS `rediss://` (Upstash, Render Key Value, AWS ElastiCache with TLS). Some
 * managed providers require enableReadyCheck=false to avoid hand-shake races
 * with BullMQ's pre-PING.
 */
export function makeRedis(url: string, extra: RedisOptions = {}): Redis {
  const isTls = url.startsWith("rediss://");
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    ...extra,
  });
}
