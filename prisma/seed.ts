import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const dbPath = path.join(__dirname, "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@selfstack.local" },
    update: {},
    create: {
      email: "admin@selfstack.local",
      name: "Admin",
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("Admin user created:", admin.email);

  // Create a default board for admin
  const existingBoard = await prisma.board.findFirst({
    where: { userId: admin.id },
  });

  if (!existingBoard) {
    const board = await prisma.board.create({
      data: {
        name: "Mein Dashboard",
        slug: `dashboard-${admin.id.slice(0, 8)}`,
        userId: admin.id,
        order: 0,
      },
    });

    // Add sample data
    const category = await prisma.category.create({
      data: {
        name: "Entwicklung",
        icon: "code",
        color: "#6366f1",
        order: 0,
        boardId: board.id,
      },
    });

    const group = await prisma.group.create({
      data: {
        name: "Tools",
        icon: "wrench",
        order: 0,
        categoryId: category.id,
      },
    });

    await prisma.tile.createMany({
      data: [
        {
          name: "GitHub",
          icon: "github",
          color: "#181717",
          url: "https://github.com",
          order: 0,
          groupId: group.id,
        },
        {
          name: "VS Code",
          icon: "code",
          color: "#007ACC",
          url: "https://code.visualstudio.com",
          order: 1,
          groupId: group.id,
        },
        {
          name: "Docker",
          icon: "container",
          color: "#2496ED",
          url: "https://docker.com",
          order: 2,
          groupId: group.id,
        },
      ],
    });

    console.log("Sample board created with demo data");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
