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

# Generate Prisma client for the build
RUN npx prisma generate

# Build the Next.js app (standalone output)
RUN npm run build

# ─── Runner ──────────────────────────────────────────────────────────────────
FROM base AS runner
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
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
# Prisma CLI + tsx for `prisma db push` / seed at container startup
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/adapter-better-sqlite3 ./node_modules/@prisma/adapter-better-sqlite3
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/tsx ./node_modules/.bin/tsx

# Data dir for SQLite + uploads (bind-mounted as volumes in production)
RUN mkdir -p /data /app/public/uploads \
    && chown -R nextjs:nodejs /data /app/public/uploads

COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

ENV PORT=3026 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL="file:/data/selfstack.db"

EXPOSE 3026

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
