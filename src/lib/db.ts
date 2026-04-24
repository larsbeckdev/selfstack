import path from "path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma CLI resolves file: URLs relative to the schema file (prisma/),
// but better-sqlite3 resolves relative to CWD (project root).
// We need to adjust the path so both point to the same file.
// Fall back to a harmless placeholder during build time — DATABASE_URL is
// only set at runtime in the Docker image, and Next.js 16 imports route
// modules during "Collecting page data" without executing queries.
const rawUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const dbUrl = rawUrl.startsWith("file:./")
  ? `file:${path.join("prisma", rawUrl.slice(7))}`
  : rawUrl;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: dbUrl,
    }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
