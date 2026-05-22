FROM node:20-alpine AS base
RUN apk add --no-cache openssl libc6-compat \
 && corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY prisma ./prisma
COPY packages/shared/package.json ./packages/shared/
COPY packages/inference-sdk/package.json ./packages/inference-sdk/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --no-frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @llmtrace/shared build \
 && pnpm --filter @llmtrace/inference-sdk build \
 && pnpm --filter @llmtrace/api prisma:generate \
 && pnpm --filter @llmtrace/api build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
EXPOSE 3232
CMD ["sh", "-c", "pnpm prisma:migrate && node dist/server.js"]
