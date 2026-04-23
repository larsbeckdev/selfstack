const { PrismaClient } = require("./src/generated/prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" }),
});

(async () => {
  const boards = await db.board.findMany({
    select: { slug: true, orgId: true, name: true },
  });
  console.log(boards);
  await db.$disconnect();
})();
