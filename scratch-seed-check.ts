import { seedDemoData } from "./src/lib/demo-seed";
import { db } from "./src/lib/db";

async function main() {
  await seedDemoData();
  const boards = await db.board.findMany({
    include: {
      user: { select: { email: true } },
      _count: { select: { categories: true } },
    },
    orderBy: { order: "asc" },
  });
  console.log("=== BOARDS ===");
  for (const b of boards) {
    console.log(
      `${b.name} | owner=${b.user?.email} | public=${b.isPublic} | order=${b.order} | cats=${b._count.categories} | slug=${b.slug}`,
    );
  }
  const demo = await db.user.findUnique({
    where: { email: "demo@selfstack.local" },
  });
  console.log("demo user:", demo?.id, "role:", demo?.role);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("SEED ERROR:", e);
    process.exit(1);
  });
