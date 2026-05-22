# k8s deploy

Self-hosted Kubernetes manifests + Helm chart for LLMTrace.

Two install paths:

| Path | When to use |
|---|---|
| `k8s/base` (kustomize) | quick demo on kind/minikube, manual edits OK |
| `helm/llmtrace` | reusable, parameterized, easier upgrades |

## Prereqs

- `kubectl` configured for a cluster (kind / minikube / k3d / real)
- [KEDA](https://keda.sh) installed — provides queue-depth autoscaling for the worker
- nginx-ingress (only if you want host routing)
- Container images pushed to a registry — defaults reference `ghcr.io/arkhamknight25/llmtrace-{api,worker,web}:latest`

Install KEDA + nginx-ingress:

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm install keda kedacore/keda --namespace keda --create-namespace

helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

## Install — kustomize

```bash
# fill in real secrets (file is gitignored)
cp k8s/base/secrets.example.yaml k8s/base/secrets.yaml
$EDITOR k8s/base/secrets.yaml

kubectl apply -k k8s/base
kubectl apply -f k8s/base/secrets.yaml
kubectl apply -f k8s/base/migrate-job.yaml   # one-shot Prisma migrate
```

## Install — Helm

```bash
helm install llmtrace ./helm/llmtrace \
  --create-namespace --namespace llmtrace \
  --set-string secrets.openaiApiKey=sk-... \
  --set-string secrets.ingestionApiKey=$(openssl rand -base64 24)
```

Override anything from `helm/llmtrace/values.yaml` via `--set`.

## Verify

```bash
kubectl -n llmtrace get pods
kubectl -n llmtrace logs deploy/api -f
kubectl -n llmtrace port-forward svc/api 3232:3232 &
curl http://localhost:3232/healthz
```

With ingress + DNS pointed at `llmtrace.local`, hit the UI in browser.

## Autoscaling

Three independent autoscalers:

| Workload | Signal | Why |
|---|---|---|
| **api** | CPU (HPA) | stateless HTTP + SSE — CPU correlates with concurrent requests |
| **web** | CPU (HPA) | Next.js SSR + RSC fetches — same |
| **worker** | **Redis list length** (KEDA ScaledObject) | event-driven consumer — CPU lags reality; queue depth is the leading indicator |

Worker autoscale logic (`k8s/base/worker.yaml`):

```yaml
triggers:
  - type: redis
    metadata:
      address: redis.llmtrace.svc.cluster.local:6379
      listName: "bull:inference-log:wait"
      listLength: "25"   # +1 pod per 25 pending jobs
```

`bull:<queueName>:wait` is BullMQ's pending-jobs list. KEDA polls every 10s. On burst (e.g. 500 logs/s landing in queue), pods scale 1 → 20 within ~30s. When queue drains, scale back to `idleReplicaCount=1` after `cooldownPeriod=60s`.

This is the right signal for the worker — CPU would lag burst load by minutes; queue depth flags it before requests start backing up.

## Observe scaling

Watch the worker scale under load:

```bash
# terminal 1: watch pods
kubectl -n llmtrace get pods -w

# terminal 2: watch HPA + ScaledObject
watch kubectl -n llmtrace get hpa,scaledobject

# terminal 3: hammer the ingest endpoint
for i in {1..2000}; do
  curl -s -X POST http://localhost:3232/api/ingest/logs \
    -H 'content-type: application/json' \
    -H "x-api-key: $INGESTION_API_KEY" \
    -d "{\"requestId\":\"req_$i\",\"provider\":\"openai\",\"model\":\"gpt-4o-mini\",\"status\":\"success\",\"latencyMs\":420,\"startedAt\":\"2026-05-22T10:00:00.000Z\"}" &
done
wait
```

Within ~60s the worker Deployment should scale up; within ~3min after the burst clears, scale back down.

## Layout

```
k8s/
  base/
    namespace.yaml
    configmap.yaml
    secrets.example.yaml   ← copy → secrets.yaml (gitignored)
    postgres.yaml          ← StatefulSet + PVC
    redis.yaml
    api.yaml               ← Deployment + Service + HPA
    worker.yaml            ← Deployment + KEDA ScaledObject
    web.yaml               ← Deployment + Service + HPA
    migrate-job.yaml       ← one-shot Prisma migrate Job
    ingress.yaml
    kustomization.yaml

helm/llmtrace/
  Chart.yaml
  values.yaml              ← all knobs
  templates/...
```

## Notes

- `EMBED_WORKER=false` in k8s — worker has its own Deployment, unlike the Render demo where it's collapsed into api.
- Postgres uses a `StatefulSet + PVC` for data persistence. Production: prefer a managed Postgres (RDS, Neon, Supabase) over this in-cluster setup.
- Secrets are committed only as `.example.yaml`. Real secrets should be applied via sealed-secrets, external-secrets, or SOPS in any environment that survives a `git clone` audit.
