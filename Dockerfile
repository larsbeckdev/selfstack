# syntax=docker/dockerfile:1.7

# ─── Base ────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
WORKDIR /app

# ─── Dependencies (with build tools for native modules like better-sqlite3) ──
FROM base AS deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
# Install full deps (includes dev deps needed for `next build`)
RUN npm ci --include=dev

# ─── Builder ─────────────────────────────────────────────────────────────────
FROM base AS builder
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Demo mode is a NEXT_PUBLIC_* flag, so it is inlined into the client bundle
# at build time — a runtime env var cannot switch it on. Accept it as a build
# arg (default off) so `docker compose build` can bake a demo image.
ARG NEXT_PUBLIC_DEMO_MODE=false
ENV NEXT_PUBLIC_DEMO_MODE=${NEXT_PUBLIC_DEMO_MODE}

# Dummy values so `next build` can collect page data without a real DB.
# These are NOT used at runtime — the runner stage overrides DATABASE_URL.
ENV DATABASE_URL="file:./dev.db" \
    JWT_SECRET="build-time-placeholder"

# Generate Prisma client for the build
RUN npx prisma generate

# Create an empty SQLite DB with the full schema so Next.js can prerender
# pages that hit the database without erroring. This file is discarded —
# only the .next/ output gets copied to the runner stage.
RUN npx prisma db push --skip-generate --accept-data-loss

# Build the Next.js app (standalone output)
RUN npm run build

# ─── Runner ──────────────────────────────────────────────────────────────────
FROM base AS runner
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl gosu \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd --system --gid 1001 nodejs \
    && useradd  --system --uid 1001 --gid nodejs nextjs

# Standalone Next.js output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma: schema + generated client + seed
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated
# Copy the full node_modules so `prisma db push` and `tsx prisma/seed.ts`
# at container startup have all their runtime and binary deps (wasm files,
# esbuild native binary, etc.). The extra image size is worth the reliability.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Data dir for SQLite + uploads (bind-mounted as volumes in production)
RUN mkdir -p /data /app/public/uploads \
    && chown -R nextjs:nodejs /data /app/public/uploads

COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

# Run as root so the entrypoint can fix ownership on bind-mounted volumes
# before dropping privileges to nextjs for the actual app.
USER root

ENV PORT=3026 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL="file:/data/selfstack.db"

EXPOSE 3026

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
