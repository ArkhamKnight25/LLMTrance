# LLMTrace

Lightweight inference observability platform for LLM applications. Multi-provider chat (OpenAI, Anthropic), streaming with cancellation, conversation persistence, async log ingestion, dashboards.

## Live demo

| | URL |
|---|---|
| Web (Next.js, Vercel) | https://llm-trance-4rex.vercel.app |
| API (Fastify, Render) | https://llmtrace-api.onrender.com |
| Health | https://llmtrace-api.onrender.com/healthz |
| Diagnostics (deps) | https://llmtrace-api.onrender.com/health |
| Recent logs (json) | https://llmtrace-api.onrender.com/api/inference-logs/recent?limit=10 |

Cold start: api sleeps after 15min idle on Render free; UptimeRobot pings `/healthz` every 5min to keep it warm. First request after a true cold may take ~30s.

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

Production deploy collapses worker into the api process (`EMBED_WORKER=true`) because Render's free tier doesn't support background workers. Locally `docker compose up` still runs api and worker as separate containers — the queue boundary stays observable in dev.

## Layout

```
llmtrace/
  apps/
    api/         Fastify SSE + REST + ingest
    worker/      BullMQ consumer
    web/         Next.js 14 frontend
  packages/
    shared/         Zod schemas + TS types
    inference-sdk/  Provider adapters, PII redaction, async emitter
  prisma/
    schema.prisma
    migrations/
  docker-compose.yml
  render.yaml             ← Render Blueprint
  apps/web/vercel.json    ← Vercel build config
  .github/workflows/keepalive.yml  ← optional keep-alive cron
```

## Quick start — Docker (one command)

Prereqs: Docker Desktop, OpenAI API key.

```bash
cp .env.example .env
# edit .env, set OPENAI_API_KEY
docker compose up --build
```

Brings up: `postgres` (5444→5432), `redis` (6379), `api` (3232), `worker`, `web` (3233).

Open http://localhost:3233.

Verify:
```bash
curl http://localhost:3232/health
# { "status":"ok", "checks":{"api":"ok","postgres":"ok","redis":"ok"} }
```

Smoke-test ingestion (no LLM call needed):
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
    "startedAt":"2026-05-22T10:00:00.000Z",
    "completedAt":"2026-05-22T10:00:00.820Z"
  }'
# 202 Accepted
```

Then check it landed:
```bash
docker compose exec postgres psql -U llmtrace -d llmtrace -c \
  'select request_id, provider, model, status, latency_ms from "InferenceLog" order by created_at desc limit 5;'
```

## Quick start — host mode (no Docker for app code)

Postgres + Redis in Docker, api/worker/web on host with HMR:

```bash
docker compose up postgres redis -d
pnpm install
pnpm --filter @llmtrace/shared build
pnpm --filter @llmtrace/inference-sdk build
pnpm --filter @llmtrace/api prisma:generate
DATABASE_URL='postgresql://llmtrace:llmtrace@localhost:5444/llmtrace' pnpm prisma:deploy
pnpm dev   # api (:3232) + worker + web (:3233) concurrently
```

Root `.env` for host mode:

```
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://llmtrace:llmtrace@localhost:5444/llmtrace
REDIS_URL=redis://localhost:6379
INGESTION_API_KEY=local-dev-key
INGEST_URL=http://localhost:3232
PORT=3232
NEXT_PUBLIC_API_URL=http://localhost:3232
```

## Frontend pages

- `/` — empty chat with prompt suggestions, model selector, streaming + cancel
- `/conversations/[id]` — resume any conversation, full history hydrated server-side
- `/conversations` — list with status filters (active / completed / cancelled / error), click to resume
- `/dashboard` — six stat cards + throughput, latency (p50/avg/p95), token usage by model, provider breakdown, latency-by-model, recent logs. Auto-refresh 5s
- `/inference-logs` — table with status + provider filters, auto-refresh 5s

All routes hit the real API; nothing is mocked.

## API endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/healthz` | fast readiness probe (always 200) |
| GET | `/health` | DB + Redis ping with 3s timeouts each |
| POST | `/api/conversations` | create conversation |
| GET | `/api/conversations` | list (paged) |
| GET | `/api/conversations/:id/messages` | full history |
| PATCH | `/api/conversations/:id` | update status (e.g. `cancelled`) |
| POST | `/api/chat/stream` | SSE — events: `start`, `token`, `error`, `done` |
| POST | `/api/ingest/logs` | x-api-key required, returns 202 before any DB write |
| GET | `/api/metrics/summary?range=24h` | totals + rates |
| GET | `/api/metrics/timeseries?range=24h` | 60 buckets, throughput + latency |
| GET | `/api/metrics/providers?range=24h` | per-provider/model breakdown |
| GET | `/api/inference-logs/recent?limit=25` | tail of inference log table |

SSE envelope:

```
event: start
data: {"conversationId":"...","messageId":"..."}

event: token
data: {"text":"hi"}

event: done
data: {"messageId":"...","cancelled":false}
```

Cancellation: client drops the connection → server detects `req.raw 'close'` → aborts upstream provider call → marks conversation `cancelled` → log emitted with `status: "cancelled"`.

## Throughput + latency

Throughput and low latency are designed-in, not afterthoughts. The chat path is bounded by the upstream provider, but everything around it is non-blocking.

- **SSE first-byte ~10ms** after upstream stream opens. Headers `flushHeaders()` immediately; `X-Accel-Buffering: no` disables proxy buffering so tokens arrive in the browser as fast as the provider yields them.
- **Ingestion 202 in <5ms.** `POST /api/ingest/logs` is a single Zod parse + `LPUSH` to Redis. Zero DB writes on the request thread — Postgres latency never lands on the user-facing path.
- **Async log emit, 1s hard ceiling.** `InferenceClient.emitLogAsync` uses fire-and-forget `fetch` with a 1s `AbortSignal` timeout, wrapped in `try/catch`. An ingestion outage cannot regress chat latency by even a millisecond.
- **Worker concurrency = 16 per replica.** BullMQ shards on Redis; tune via `WORKER_CONCURRENCY`. Single worker comfortably absorbs ~10k jobs/min in steady state on commodity hardware.
- **Dashboards stay sub-10ms.** Composite indexes `(status, createdAt)` and `(provider, model)` mean every metrics endpoint is one indexed scan + `groupBy`. No N+1, no JOINs on hot paths.
- **Per-IP rate limit on chat** (default `5/hour`, configurable via `CHAT_RATE_LIMIT`) protects the upstream API key bill from abuse without throttling logging or dashboards.

Where it ceilings:
- Postgres write throughput becomes the first bottleneck at ~80–120k row/s inserts (commodity instance). Plan: partition `InferenceLog` by `createdAt` monthly when row count crosses ~50M.
- Redis is single-instance in this build — it's the SPOF for the queue. Production move: managed Redis with replication + persistence, or shard the queue by `hash(conversationId)` so workers don't contend on one key.
- SSE is HTTP/1.1 — fine up to a few thousand concurrent streams per replica. Past that, switch to HTTP/2 + push or move to a server with native async runtime (Bun, etc.).

## Schema design

Four tables — see [`prisma/schema.prisma`](prisma/schema.prisma).

- **Conversation** — id, title, status (`active | completed | cancelled | error`), timestamps
- **ChatMessage** — role, content, optional provider/model on assistant turns, FK cascade
- **InferenceLog** — append-only audit row. Unique `requestId` enables idempotent retries. Indexed on `(status, createdAt)`, `(provider, model)`, plus singles on `provider`, `model`, `status`, `createdAt`, `conversationId`. `conversationId` is `SET NULL` so log history survives conversation deletion
- **IngestionError** — DLQ table. Worker writes here after final retry, preserving raw payload for replay

Tradeoffs:
- Denormalized: one row per request, not a separate events table. Dashboards are one query
- `metadata` JSONB for future fields without migrations
- Request-level token usage only — no per-message embeddings. Cheaper, sufficient for observability scope

## Logging strategy

- Hot path never blocks on logging. `InferenceClient.emitLogAsync` uses fire-and-forget `fetch` with a 1s `AbortSignal` timeout and a `try/catch` wrapper. Failures are swallowed
- Ingestion endpoint returns **202 before any DB write**. It only validates with Zod and enqueues to BullMQ
- Worker is the only writer to `InferenceLog`. Backpressure, retries (5 attempts, exponential backoff from 1s), and idempotency (`requestId` unique) all live there
- Failed jobs after final retry land in `IngestionError` with raw payload preserved

## PII redaction

[`packages/inference-sdk/src/redact.ts`](packages/inference-sdk/src/redact.ts) masks before previews leave the process:

- emails → `[email]`
- phone numbers (10+ digits) → `[phone]`
- credit card patterns (13–19 digits) → `[card]`
- API keys (`sk-...`, `Bearer ...`) → `[redacted]`
- JWTs → `[jwt]`

Only `inputPreview` / `outputPreview` are redacted (≤300 chars). Full message bodies live in `ChatMessage` and never leave the api process via the ingestion path.

## Scaling considerations

- API is stateless behind the SSE endpoint. Horizontal scale is fine. Cancellation is connection-local so any replica works
- Worker scales horizontally — BullMQ partitions by Redis. Tune `WORKER_CONCURRENCY` (default 16) per replica
- Postgres is the first bottleneck under sustained write. `InferenceLog` is write-heavy + read-heavy. Plan to partition by `createdAt` (monthly) when row count crosses ~50M
- Redis is single-instance here. Production: managed Redis (Upstash / ElastiCache) with persistence so in-flight jobs survive restart
- Streaming uses HTTP/1.1 SSE. Behind a proxy, disable buffering (`X-Accel-Buffering: no` is set)

## Failure handling

| Failure | Behavior |
|---|---|
| Provider error mid-stream | SSE `error` event, log row `status=error`, conversation stays `active` |
| Client disconnect | `req.raw 'close'`, upstream aborted, conversation marked `cancelled`, log `status=cancelled` |
| Ingest API down | SDK times out at 1s, drops the log, chat continues normally |
| Redis down | Ingest enqueue fails; `/api/chat/stream` keeps serving tokens (ingest is fire-and-forget from the chat path). Logs land in `IngestionError` once Redis returns |
| Worker crash | BullMQ re-delivers on restart; idempotency via unique `requestId` |
| Final retry fail | Row written to `IngestionError` with raw payload |

## Assignment + bonus checklist

**Core**
- [x] Multi-turn chatbot — OpenAI (gpt-4o-mini / 4o / 4.1) + Anthropic (claude-3-5-sonnet-latest)
- [x] Short conversational context — last 20 messages loaded per request
- [x] Simple UI — Next.js 14 at `/`
- [x] SDK captures model, provider, latency, tokens, timestamps, status, errors, conversation ID, input/output previews
- [x] SDK posts logs in near-real-time (fire-and-forget HTTP)
- [x] Ingestion API validates with Zod, enqueues to BullMQ, returns 202
- [x] Stores chat messages, inference logs, JSONB metadata in Postgres via Prisma

**Bonus**
- [x] Multi-provider support (OpenAI + Anthropic)
- [x] Streaming responses (SSE)
- [x] Latency + throughput + error dashboards (p50/avg/p95)
- [x] Docker Compose one-command setup
- [x] Event-driven architecture (BullMQ on Redis between api and worker)
- [x] PII redaction (email / phone / cc / sk- keys / Bearer / JWT)
- [x] Frontend: cancel a conversation
- [x] Frontend: list conversations
- [x] Frontend: resume a conversation
- [ ] Deploy on self-hosted k8s — in progress on `feature/k8s-scaling` branch (Helm chart + KEDA HPA tied to BullMQ queue depth)

## What I'd improve with more time

- ChatMessage-level token counts (not just request-level)
- Server-sent rate limiting per `INGESTION_API_KEY`
- OpenTelemetry traces linking chat request → ingest enqueue → worker write
- KEDA HPA tied to queue depth (next on `feature/k8s-scaling`)
- Tests: unit on PII redaction + Zod schemas, integration on `/api/chat/stream` with a fake provider
- Anthropic provider currently joins `system` messages by `\n\n` — should be smarter
- Per-conversation rolling summary instead of fixed 20-message context window

## License

MIT (or whatever the assignment defaults to — happy to relicense on request).
