import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();

function toSlug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function uniqueSlug(base) {
  let slug = base || "user";
  let n = 0;
  while (await prisma.user.findUnique({ where: { username: slug } })) {
    n++;
    slug = `${base}-${n}`;
  }
  return slug;
}

const users = await prisma.user.findMany({ where: { username: null } });
console.log(`Found ${users.length} user(s) without username.`);

for (const u of users) {
  const local = u.email.split("@")[0];
  const base = toSlug(local) || toSlug(u.name) || `user-${u.id.slice(0, 6)}`;
  const username = await uniqueSlug(base);
  await prisma.user.update({
    where: { id: u.id },
    data: { username },
  });

  // Also fix any boards that have a slug without a username prefix.
  const boards = await prisma.board.findMany({ where: { userId: u.id } });
  for (const b of boards) {
    if (!b.slug.includes("/") && u.role !== "admin") {
      let newSlug = `${username}/${b.slug}`;
      let n = 0;
      while (
        await prisma.board.findFirst({
          where: { slug: newSlug, NOT: { id: b.id } },
        })
      ) {
        n++;
        newSlug = `${username}/${b.slug}-${n}`;
      }
      await prisma.board.update({
        where: { id: b.id },
        data: { slug: newSlug },
      });
      console.log(`  board ${b.id}: ${b.slug} -> ${newSlug}`);
    }
  }

  console.log(`  user ${u.email} -> ${username}`);
}

await prisma.$disconnect();
