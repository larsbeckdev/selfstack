import { seedDemoData } from "./src/lib/demo-seed";
import { db } from "./src/lib/db";
import {
  canViewBoards,
  canViewAllBoards,
  canCreatePersonalBoards,
} from "./src/lib/permissions";

async function main() {
  await seedDemoData();
  const demo = await db.user.findUnique({
    where: { email: "demo@selfstack.local" },
  });
  const role = demo!.role;
  console.log("demo role:", role);
  console.log("canViewBoards:", canViewBoards(role));
  console.log("canViewAllBoards:", canViewAllBoards(role));
  console.log("canCreatePersonalBoards:", canCreatePersonalBoards(role));

  // Replicate dashboard where-clause for a member.
  const boards = await db.board.findMany({
    where: {
      OR: [
        { userId: demo!.id },
        { members: { some: { userId: demo!.id } } },
        {
          organization: { is: { members: { some: { userId: demo!.id } } } },
        },
      ],
    },
    select: { name: true, slug: true },
    orderBy: { order: "asc" },
  });
  console.log("visible boards:", boards.map((b) => b.name).join(", "));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  });
