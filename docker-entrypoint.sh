#!/bin/sh
set -e

# Apply schema to the SQLite database on every startup (idempotent).
# This creates the DB on first boot and applies any pending schema changes.
echo "→ Running prisma db push …"
npx --no-install prisma db push --accept-data-loss --skip-generate

# Seed only if the admin user does not exist yet.
# The seed script uses `upsert` semantics so it is safe to re-run, but we
# still gate it on first boot via a marker file to keep logs clean.
if [ ! -f /data/.seeded ]; then
    echo "→ Seeding database …"
    npx --no-install tsx prisma/seed.ts || true
    touch /data/.seeded
fi

exec "$@"
