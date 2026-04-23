import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * Wipe all user-owned content and re-seed the database with a rich demo
 * dataset. Safe to call repeatedly. The wipe relies on the `onDelete: Cascade`
 * relations declared in `schema.prisma` — deleting users removes their
 * boards/sessions/org-memberships; deleting orgs removes their memberships
 * and nulls board.orgId.
 */
export async function seedDemoData(): Promise<void> {
  // 1) Wipe
  await db.$transaction([
    db.tile.deleteMany({}),
    db.group.deleteMany({}),
    db.category.deleteMany({}),
    db.boardMember.deleteMany({}),
    db.board.deleteMany({}),
    db.organizationMember.deleteMany({}),
    db.organization.deleteMany({}),
    db.session.deleteMany({}),
    db.user.deleteMany({}),
    db.systemSetting.deleteMany({}),
  ]);

  // 2) System settings — disable registration so demo users don't pile up
  await db.systemSetting.createMany({
    data: [
      { key: "registration_enabled", value: "false" },
      { key: "app_url", value: process.env.APP_URL || "http://localhost:3025" },
    ],
  });

  // 3) Users
  const [adminHash, demoHash] = await Promise.all([
    bcrypt.hash("admin123", 12),
    bcrypt.hash("demo1234", 12),
  ]);

  const admin = await db.user.create({
    data: {
      email: "admin@selfstack.local",
      username: "admin",
      name: "Admin",
      password: adminHash,
      role: "admin",
    },
  });

  const demo = await db.user.create({
    data: {
      email: "demo@selfstack.local",
      username: "demo",
      name: "Demo-Nutzer",
      password: demoHash,
      role: "user",
    },
  });

  // 4) Organization
  const acme = await db.organization.create({
    data: {
      name: "Acme GmbH",
      slug: "acme",
      icon: "building-2",
      members: {
        create: [
          { userId: admin.id, role: "owner" },
          { userId: demo.id, role: "member" },
        ],
      },
    },
  });

  // ─── Helper to seed a fully-populated board ─────────────────────────────
  type TileIn = {
    name: string;
    icon?: string;
    url?: string;
    color?: string;
    description?: string;
    statusCheck?: boolean;
    size?: "small" | "default" | "large";
  };
  type GroupIn = { name: string; icon: string; tiles: TileIn[] };
  type CategoryIn = {
    name: string;
    icon: string;
    color: string;
    groups: GroupIn[];
  };

  async function buildBoard(opts: {
    userId: string;
    orgId?: string | null;
    name: string;
    slug: string;
    icon?: string;
    isPublic?: boolean;
    order: number;
    categories: CategoryIn[];
  }) {
    const board = await db.board.create({
      data: {
        name: opts.name,
        slug: opts.slug,
        icon: opts.icon ?? "layout-dashboard",
        isPublic: opts.isPublic ?? false,
        order: opts.order,
        userId: opts.userId,
        orgId: opts.orgId ?? null,
      },
    });

    for (let ci = 0; ci < opts.categories.length; ci++) {
      const cat = opts.categories[ci];
      const category = await db.category.create({
        data: {
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          x: 0,
          y: ci * 8,
          w: 4, // full-width category (1..4 range)
          h: 8,
          boardId: board.id,
        },
      });

      for (let gi = 0; gi < cat.groups.length; gi++) {
        const g = cat.groups[gi];
        // Groups live in a 2-column grid inside the category. Use half-width
        // (w=1) so two groups sit side by side; stack further groups onto
        // the next row.
        const group = await db.group.create({
          data: {
            name: g.name,
            icon: g.icon,
            x: gi % 2,
            y: Math.floor(gi / 2) * 4,
            w: 1,
            h: 4,
            categoryId: category.id,
          },
        });

        for (let ti = 0; ti < g.tiles.length; ti++) {
          const t = g.tiles[ti];
          // Half-width group in a full-width category → 6 inner columns.
          // Default tile = 2×2, so 3 tiles per row at x = 0,2,4.
          await db.tile.create({
            data: {
              name: t.name,
              icon: t.icon ?? "square",
              color: t.color ?? "#6366f1",
              url: t.url,
              description: t.description,
              statusCheck: t.statusCheck ?? false,
              size: t.size ?? "default",
              x: (ti % 3) * 2,
              y: Math.floor(ti / 3) * 2,
              groupId: group.id,
            },
          });
        }
      }
    }
    return board;
  }

  // 5) Admin system board (public)
  await buildBoard({
    userId: admin.id,
    name: "Selfstack Demo",
    slug: "demo",
    icon: "sparkles",
    isPublic: true,
    order: 0,
    categories: [
      {
        name: "Entwicklung",
        icon: "code",
        color: "#6366f1",
        groups: [
          {
            name: "Code & Hosting",
            icon: "github",
            tiles: [
              {
                name: "GitHub",
                icon: "github",
                color: "#181717",
                url: "https://github.com",
              },
              {
                name: "GitLab",
                icon: "gitlab",
                color: "#fc6d26",
                url: "https://gitlab.com",
              },
              {
                name: "Codeberg",
                icon: "git-branch",
                color: "#2185d0",
                url: "https://codeberg.org",
              },
            ],
          },
          {
            name: "Tools",
            icon: "wrench",
            tiles: [
              {
                name: "VS Code",
                icon: "code",
                color: "#007acc",
                url: "https://code.visualstudio.com",
              },
              {
                name: "Docker",
                icon: "container",
                color: "#2496ed",
                url: "https://docker.com",
              },
              {
                name: "Postman",
                icon: "send",
                color: "#ef5b25",
                url: "https://postman.com",
              },
            ],
          },
        ],
      },
      {
        name: "Services",
        icon: "server",
        color: "#10b981",
        groups: [
          {
            name: "Monitoring",
            icon: "activity",
            tiles: [
              {
                name: "Status Page",
                icon: "heart-pulse",
                color: "#10b981",
                url: "https://example.com",
                statusCheck: true,
              },
              {
                name: "Grafana",
                icon: "line-chart",
                color: "#f46800",
                url: "https://grafana.com",
              },
            ],
          },
          {
            name: "Kommunikation",
            icon: "message-square",
            tiles: [
              {
                name: "Slack",
                icon: "slack",
                color: "#4a154b",
                url: "https://slack.com",
              },
              {
                name: "Discord",
                icon: "message-circle",
                color: "#5865f2",
                url: "https://discord.com",
              },
            ],
          },
        ],
      },
    ],
  });

  // 6) Demo user personal board
  await buildBoard({
    userId: demo.id,
    name: "Mein Dashboard",
    slug: "demo/dashboard",
    icon: "home",
    order: 0,
    categories: [
      {
        name: "Täglich",
        icon: "sun",
        color: "#f59e0b",
        groups: [
          {
            name: "News",
            icon: "newspaper",
            tiles: [
              {
                name: "Hacker News",
                icon: "newspaper",
                color: "#ff6600",
                url: "https://news.ycombinator.com",
              },
              {
                name: "Reddit",
                icon: "message-square",
                color: "#ff4500",
                url: "https://reddit.com",
              },
            ],
          },
          {
            name: "Medien",
            icon: "play",
            tiles: [
              {
                name: "YouTube",
                icon: "youtube",
                color: "#ff0000",
                url: "https://youtube.com",
              },
              {
                name: "Spotify",
                icon: "music",
                color: "#1db954",
                url: "https://spotify.com",
              },
            ],
          },
        ],
      },
    ],
  });

  // 7) Org-owned board
  await buildBoard({
    userId: admin.id,
    orgId: acme.id,
    name: "Team-Board",
    slug: "acme/team",
    icon: "users",
    order: 1,
    categories: [
      {
        name: "Workflow",
        icon: "kanban",
        color: "#8b5cf6",
        groups: [
          {
            name: "Tools",
            icon: "briefcase",
            tiles: [
              {
                name: "Notion",
                icon: "book-open",
                color: "#000000",
                url: "https://notion.so",
              },
              {
                name: "Linear",
                icon: "target",
                color: "#5e6ad2",
                url: "https://linear.app",
              },
              {
                name: "Figma",
                icon: "figma",
                color: "#f24e1e",
                url: "https://figma.com",
              },
            ],
          },
        ],
      },
    ],
  });
}
