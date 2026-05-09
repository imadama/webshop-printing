# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile for the Medusa backend (built from monorepo root).
# Build with: docker build -f apps/backend/Dockerfile -t popify-backend .

FROM node:20-alpine AS base
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate
RUN apk add --no-cache python3 make g++ libc6-compat


FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/storefront/package.json ./apps/storefront/
RUN pnpm fetch


FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /usr/local/share/pnpm /usr/local/share/pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY apps/backend ./apps/backend
COPY apps/storefront/package.json ./apps/storefront/
RUN pnpm install --frozen-lockfile --offline
RUN cd apps/backend && pnpm build


FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Production deps only, hoisted at the build output dir
COPY --from=build /app/apps/backend/.medusa/server ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts || pnpm install --prod --ignore-scripts

# Healthcheck: the backend exposes /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:9000/health || exit 1

EXPOSE 9000

# Migrations run on each container start; safe because Medusa skips already-run scripts.
CMD ["sh", "-c", "node ./node_modules/@medusajs/medusa/dist/commands/db/migrate.js && node ./index.js"]
