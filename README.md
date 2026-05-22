# LLMTrace

Lightweight inference observability platform for LLM applications. Multi-provider chat (OpenAI, Anthropic), streaming with cancellation, conversation persistence, async log ingestion, dashboards.

## Architecture

```
[ apps/web ]  Next.js — chat UI, conversations, dashboard, recent logs
     │  HTTP / SSE
     ▼
[ apps/api ]  Fastify — REST + SSE streaming, ingestion endpoint
     │              │
     │ Prisma       │ BullMQ enqueue (fire-and-forget)
     ▼              ▼
[ Postgres 16 ]  [ Redis 7 ]
                    │
                    │ BullMQ consume
                    ▼
            [ apps/worker ] — validates payload, writes InferenceLog
                    │
                    ▼
            [ Postgres ]
```

Inference flow:

```
chat req → /api/chat/stream → SDK.stream() → provider SSE
                                  │
                                  └─► emitLogAsync (1s timeout, never throws)
                                          │
                                          ▼
                                  POST /api/ingest/logs
                                          │
                                          ▼ 202 immediately
                                  BullMQ enqueue
                                          │
                                          ▼
                                  worker → Prisma → Postgres
```

## Layout

```
llmtrace/
  apps/
    api/         Fastify SSE + REST + ingest
    worker/      BullMQ consumer
    web/         Next.js frontend (Phase 2)
  packages/
    shared/      Zod schemas + TS types
    inference-sdk/  Provider adapters, PII redaction, async emitter
  prisma/
    schema.prisma
    migrations/
  docker-compose.yml
```

## Quick start

Prereqs: Docker Desktop, pnpm (only for local dev outside containers).

1. Copy env:

```bash
cp .env.example .env
# fill OPENAI_API_KEY (required for chat demo)
# ANTHROPIC_API_KEY optional
```

2. Boot stack:

```bash
docker compose up --build
```

Brings up: `postgres`, `redis`, `api` (3232), `worker`. Web (Next.js, port 3233) is gated behind the `web` profile:

```bash
docker compose --profile web up --build
```

### Local dev without Docker

Postgres + Redis only via Docker; api, worker, web run on host with pnpm:

```bash
docker compose up postgres redis -d
pnpm install
pnpm --filter @llmtrace/shared build
pnpm --filter @llmtrace/inference-sdk build
pnpm --filter @llmtrace/api prisma:generate
DATABASE_URL='postgresql://llmtrace:llmtrace@localhost:5432/llmtrace' \
  pnpm prisma:deploy
# put localhost-flavored vars in a root .env, then:
pnpm dev   # api (:3232) + worker + web (:3233) concurrently
```

Root `.env` for host-mode dev:

```
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://llmtrace:llmtrace@localhost:5432/llmtrace
REDIS_URL=redis://localhost:6379
INGESTION_API_KEY=local-dev-key
INGEST_URL=http://localhost:3232
PORT=3232
NEXT_PUBLIC_API_URL=http://localhost:3232
```

Open http://localhost:3233.

## Frontend pages

- `/` — empty chat with prompt suggestions, model selector, streaming + cancel
- `/conversations/[id]` — resume any conversation, full history hydrated server-side
- `/conversations` — list with status filters (active / completed / cancelled / error), click to resume
- `/dashboard` — 6 stat cards + throughput, latency (p50/avg/p95), token usage by model, provider breakdown, latency-by-model, recent logs. Auto-refresh 5s.
- `/inference-logs` — full table with status + provider filters, auto-refresh 5s

All frontend routes are wired to the real API; nothing is mocked.

3. Verify:

```bash
curl http://localhost:3232/health
# { "status":"ok", "db":"ok", "redis":"ok" }
```

4. Smoke-test ingestion (no LLM call needed):

```bash
curl -X POST http://localhost:3232/api/ingest/logs \
  -H 'content-type: application/json' \
  -H 'x-api-key: local-dev-key' \
  -d '{
    "requestId":"req_test_1",
    "provider":"openai",
    "model":"gpt-4o-mini",
    "status":"success",
    "latencyMs":820,
    "inputTokens":42,
    "outputTokens":120,
    "totalTokens":162,
    "inputPreview":"hello",
    "outputPreview":"hi there",
    "startedAt":"2026-05-22T10:00:00.000Z",
    "completedAt":"2026-05-22T10:00:00.820Z"
  }'
# 202 Accepted
```

Then check it landed in Postgres:

```bash
docker compose exec postgres psql -U llmtrace -d llmtrace -c \
  'select request_id, provider, model, status, latency_ms from "InferenceLog" order by created_at desc limit 5;'
```

5. Stream a chat (requires OPENAI_API_KEY):

```bash
curl -N -X POST http://localhost:3232/api/chat/stream \
  -H 'content-type: application/json' \
  -d '{"message":"Say hi in two words","provider":"openai","model":"gpt-4o-mini"}'
```

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET  | `/health` | DB + Redis ping |
| POST | `/api/conversations` | create conversation |
| GET  | `/api/conversations` | list (paged) |
| GET  | `/api/conversations/:id/messages` | full history |
| PATCH| `/api/conversations/:id` | update status (e.g. `cancelled`) |
| POST | `/api/chat/stream` | SSE — events: `start`, `token`, `error`, `done` |
| POST | `/api/ingest/logs` | returns 202 before any DB write |
| GET  | `/api/metrics/summary?range=24h` | summary cards |
| GET  | `/api/metrics/timeseries?range=24h` | throughput + latency buckets |
| GET  | `/api/metrics/providers?range=24h` | per-provider breakdown |

SSE envelope:

```
event: start
data: {"conversationId":"...","messageId":"..."}

event: token
data: {"text":"hi"}

event: done
data: {"messageId":"...","cancelled":false}
```

Cancellation: client drops connection → server detects `req.raw 'close'` → aborts upstream provider call → marks conversation `cancelled` → log emitted with `status: "cancelled"`.

## Schema design

Four tables — see `prisma/schema.prisma`.

- `Conversation` — id, title, status (`active|completed|cancelled`), timestamps.
- `ChatMessage` — role, content, optional provider/model on assistant turns. FK cascade.
- `InferenceLog` — append-only audit row. Unique `requestId` enables idempotent retries from the worker. Indexed on `(status, createdAt)`, `(provider, model)`, plus singles on `provider`, `model`, `status`, `createdAt`, `conversationId`. `conversationId` is `SET NULL` so we never lose log history when a conversation is deleted.
- `IngestionError` — DLQ-style table. Worker writes here after final retry, preserving raw payload for replay.

Tradeoffs:
- One denormalized `InferenceLog` row per request, not a separate `events` table. Dashboards stay one-query.
- `metadata` Jsonb for future fields without migrations.
- No vector embeddings / no message-level token stats — only request-level usage. Cheaper, sufficient for observability scope.

## Logging strategy

- Hot path never blocks on logging. `InferenceClient.emitLogAsync` uses fire-and-forget `fetch` with a 1s `AbortSignal` timeout and a try/catch wrapper. Failures are swallowed.
- Ingestion endpoint returns **202 before any DB write**. It only validates with Zod and enqueues to BullMQ.
- Worker is the only writer to `InferenceLog`. Backpressure, retries (5 attempts, exponential backoff from 1s), and idempotency (`requestId` unique) all live there.
- Failed jobs after final retry land in `IngestionError` with raw payload preserved.

## PII redaction

`packages/inference-sdk/src/redact.ts` masks before previews leave the process:

- emails → `[redacted-email]`
- phone numbers (10+ digits) → `[redacted-phone]`
- credit card patterns (13–19 digits) → `[redacted-cc]`
- API keys (`sk-...`, `Bearer ...`) → `[redacted-key]`
- JWTs → `[redacted-jwt]`

Only `inputPreview` / `outputPreview` are redacted (≤300 chars). Full message bodies live in `ChatMessage` and are never sent to the ingestion API.

## Scaling considerations

- API is stateless behind the SSE endpoint. Horizontal scale fine until you need sticky cancellation; cancellation here is connection-local so any replica works.
- Worker scales horizontally — BullMQ partitions by Redis. Bump `WORKER_CONCURRENCY` (default 16) per replica.
- Postgres is the first bottleneck. `InferenceLog` is write-heavy + read-heavy. Partition by `createdAt` (monthly) when row count crosses ~50M.
- Redis is single-instance here. Production: managed Redis (ElastiCache/Upstash) with persistence enabled so in-flight jobs survive restart.
- Streaming uses HTTP/1.1 SSE. Behind a proxy disable buffering (`X-Accel-Buffering: no` is set).

## Failure handling

| Failure | Behavior |
|---|---|
| Provider error mid-stream | SSE `error` event, log row `status=error`, conversation stays `active` |
| Client disconnect | Detected via `req.raw 'close'`, upstream aborted, conversation marked `cancelled`, log `status=cancelled` |
| Ingest API down | SDK times out at 1s, drops the log, chat continues normally |
| Redis down | Ingest API returns 503 on enqueue, but `/api/chat/stream` still serves tokens (ingest is fire-and-forget from the chat path) |
| Worker crash | BullMQ re-delivers on restart; idempotency via unique `requestId` |
| Final retry fail | Row written to `IngestionError` with raw payload |

## What I'd improve with more time

- `ChatMessage` token counts (not just request-level).
- Server-sent rate limiting per `INGESTION_API_KEY`.
- OpenTelemetry traces linking chat request → ingest enqueue → worker write.
- KEDA HPA targeting BullMQ queue depth (k8s branch).
- Tests: unit on PII redaction + Zod schemas, integration on `/api/chat/stream` with a fake provider.
- Anthropic provider currently maps `system` messages to a single `system` arg by joining — should be smarter.
- Per-conversation rolling summary instead of fixed 20-message window.

## Status: Phase 1

Backend foundation complete. Frontend (`apps/web`) deferred to Phase 2 — design assets are in `_design/` and the API contract is finalized.
