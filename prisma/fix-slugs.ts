import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbPath = path.join(__dirname, "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const boards = await prisma.board.findMany();
  for (const board of boards) {
    // Generate clean slug from name
    const baseSlug = board.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug needs updating (has hash suffix)
    if (board.slug !== baseSlug) {
      // Ensure uniqueness
      let slug = baseSlug;
      let counter = 0;
      while (true) {
        const existing = await prisma.board.findUnique({ where: { slug } });
        if (!existing || existing.id === board.id) break;
        counter++;
        slug = `${baseSlug}-${counter}`;
      }

      await prisma.board.update({
        where: { id: board.id },
        data: { slug },
      });
      console.log(`Updated: "${board.slug}" -> "${slug}"`);
    } else {
      console.log(`OK: "${board.slug}"`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
