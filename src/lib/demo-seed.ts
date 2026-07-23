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
  type GroupIn = {
    name: string;
    icon: string;
    layout?: "grid" | "list";
    tiles: TileIn[];
  };
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
          y: ci,
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
            layout: g.layout ?? "grid",
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

  // 5) Showcase board — owned by the demo user so it lands on their
  // dashboard immediately after the demo login (the dashboard lists own +
  // shared + org boards, not merely public ones).
  await buildBoard({
    userId: demo.id,
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
          {
            name: "Docs",
            icon: "book-open",
            layout: "list",
            tiles: [
              {
                name: "MDN Web Docs",
                icon: "book",
                color: "#000000",
                url: "https://developer.mozilla.org",
                description: "Reference for web standards",
              },
              {
                name: "Next.js Docs",
                icon: "file-text",
                color: "#000000",
                url: "https://nextjs.org/docs",
                description: "App Router & Server Components",
              },
              {
                name: "Prisma Docs",
                icon: "database",
                color: "#2d3748",
                url: "https://www.prisma.io/docs",
                description: "ORM & Schema Reference",
              },
              {
                name: "Tailwind CSS",
                icon: "palette",
                color: "#38bdf8",
                url: "https://tailwindcss.com",
                description: "Utility-first CSS",
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
              {
                name: "Uptime Kuma",
                icon: "bell",
                color: "#5cdd8b",
                url: "https://uptime.kuma.pet",
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
              {
                name: "Mattermost",
                icon: "messages-square",
                color: "#1e325c",
                url: "https://mattermost.com",
              },
            ],
          },
          {
            name: "Datenbanken",
            icon: "database",
            tiles: [
              {
                name: "PostgreSQL",
                icon: "database",
                color: "#336791",
                url: "https://www.postgresql.org",
              },
              {
                name: "Redis",
                icon: "zap",
                color: "#dc382d",
                url: "https://redis.io",
              },
              {
                name: "MongoDB",
                icon: "leaf",
                color: "#13aa52",
                url: "https://www.mongodb.com",
              },
            ],
          },
        ],
      },
      {
        name: "Lernen",
        icon: "graduation-cap",
        color: "#f59e0b",
        groups: [
          {
            name: "Kurse",
            icon: "book-open",
            layout: "list",
            tiles: [
              {
                name: "Frontend Masters",
                icon: "monitor",
                color: "#c50000",
                url: "https://frontendmasters.com",
                description: "Video courses for web development",
              },
              {
                name: "egghead.io",
                icon: "play-circle",
                color: "#252526",
                url: "https://egghead.io",
                description: "Kurze Screencasts",
              },
              {
                name: "Coursera",
                icon: "graduation-cap",
                color: "#0056d2",
                url: "https://coursera.org",
                description: "University courses online",
              },
            ],
          },
          {
            name: "Books",
            icon: "book",
            tiles: [
              {
                name: "O'Reilly",
                icon: "book",
                color: "#d3002d",
                url: "https://www.oreilly.com",
              },
              {
                name: "Manning",
                icon: "book",
                color: "#8e5b9e",
                url: "https://www.manning.com",
              },
            ],
          },
        ],
      },
      {
        name: "Inspiration",
        icon: "sparkles",
        color: "#ec4899",
        groups: [
          {
            name: "Design",
            icon: "palette",
            tiles: [
              {
                name: "Dribbble",
                icon: "dribbble",
                color: "#ea4c89",
                url: "https://dribbble.com",
              },
              {
                name: "Behance",
                icon: "image",
                color: "#1769ff",
                url: "https://behance.net",
              },
              {
                name: "Awwwards",
                icon: "award",
                color: "#000000",
                url: "https://awwwards.com",
              },
            ],
          },
          {
            name: "Community",
            icon: "users",
            tiles: [
              {
                name: "Hacker News",
                icon: "newspaper",
                color: "#ff6600",
                url: "https://news.ycombinator.com",
              },
              {
                name: "Lobsters",
                icon: "message-square",
                color: "#ac130d",
                url: "https://lobste.rs",
              },
              {
                name: "Dev.to",
                icon: "code",
                color: "#0a0a0a",
                url: "https://dev.to",
              },
            ],
          },
        ],
      },
    ],
  });

  // 6) Demo user personal board (sorts after the showcase board above)
  await buildBoard({
    userId: demo.id,
    name: "Mein Dashboard",
    slug: "demo/dashboard",
    icon: "home",
    order: 1,
    categories: [
      {
        name: "Daily",
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
              {
                name: "Twitch",
                icon: "twitch",
                color: "#9146ff",
                url: "https://twitch.tv",
              },
            ],
          },
        ],
      },
      {
        name: "Produktivität",
        icon: "check-circle",
        color: "#0ea5e9",
        groups: [
          {
            name: "Aufgaben",
            icon: "list-checks",
            tiles: [
              {
                name: "Todoist",
                icon: "check-square",
                color: "#e44332",
                url: "https://todoist.com",
              },
              {
                name: "TickTick",
                icon: "calendar-check",
                color: "#4772fa",
                url: "https://ticktick.com",
              },
            ],
          },
          {
            name: "Notizen",
            icon: "notebook-pen",
            tiles: [
              {
                name: "Obsidian",
                icon: "gem",
                color: "#7c3aed",
                url: "https://obsidian.md",
              },
              {
                name: "Notion",
                icon: "book-open",
                color: "#000000",
                url: "https://notion.so",
              },
            ],
          },
        ],
      },
      {
        name: "Finanzen",
        icon: "wallet",
        color: "#22c55e",
        groups: [
          {
            name: "Banking",
            icon: "landmark",
            layout: "list",
            tiles: [
              {
                name: "PayPal",
                icon: "credit-card",
                color: "#003087",
                url: "https://paypal.com",
                description: "Online payments",
              },
              {
                name: "Wise",
                icon: "arrow-left-right",
                color: "#9fe870",
                url: "https://wise.com",
                description: "International transfers",
              },
            ],
          },
        ],
      },
    ],
  });

  // 6b) Second demo-user board — a homelab/self-hosting theme so the demo
  // shows a user with more than one board.
  await buildBoard({
    userId: demo.id,
    name: "Homelab",
    slug: "demo/homelab",
    icon: "server",
    order: 2,
    categories: [
      {
        name: "Infrastruktur",
        icon: "network",
        color: "#8b5cf6",
        groups: [
          {
            name: "Container",
            icon: "container",
            tiles: [
              {
                name: "Portainer",
                icon: "container",
                color: "#13bef9",
                url: "https://www.portainer.io",
              },
              {
                name: "Proxmox",
                icon: "server-cog",
                color: "#e57000",
                url: "https://www.proxmox.com",
              },
              {
                name: "Traefik",
                icon: "route",
                color: "#24a1c1",
                url: "https://traefik.io",
              },
            ],
          },
          {
            name: "Netzwerk",
            icon: "wifi",
            tiles: [
              {
                name: "Pi-hole",
                icon: "shield",
                color: "#96060c",
                url: "https://pi-hole.net",
                statusCheck: true,
              },
              {
                name: "OPNsense",
                icon: "shield-check",
                color: "#d94f00",
                url: "https://opnsense.org",
              },
            ],
          },
        ],
      },
      {
        name: "Apps",
        icon: "boxes",
        color: "#f43f5e",
        groups: [
          {
            name: "Medien",
            icon: "clapperboard",
            tiles: [
              {
                name: "Jellyfin",
                icon: "clapperboard",
                color: "#00a4dc",
                url: "https://jellyfin.org",
              },
              {
                name: "Immich",
                icon: "image",
                color: "#4250af",
                url: "https://immich.app",
              },
            ],
          },
          {
            name: "Cloud",
            icon: "cloud",
            tiles: [
              {
                name: "Nextcloud",
                icon: "cloud",
                color: "#0082c9",
                url: "https://nextcloud.com",
              },
              {
                name: "Vaultwarden",
                icon: "key-round",
                color: "#175ddc",
                url: "https://github.com/dani-garcia/vaultwarden",
              },
            ],
          },
        ],
      },
    ],
  });

  // 6c) Admin personal board — a private ops/admin board so the admin account
  // also has content of its own beyond the org board.
  await buildBoard({
    userId: admin.id,
    name: "Admin-Tools",
    slug: "admin/tools",
    icon: "wrench",
    order: 0,
    categories: [
      {
        name: "Betrieb",
        icon: "gauge",
        color: "#ef4444",
        groups: [
          {
            name: "Monitoring",
            icon: "activity",
            tiles: [
              {
                name: "Grafana",
                icon: "line-chart",
                color: "#f46800",
                url: "https://grafana.com",
              },
              {
                name: "Prometheus",
                icon: "flame",
                color: "#e6522c",
                url: "https://prometheus.io",
              },
              {
                name: "Netdata",
                icon: "gauge",
                color: "#00ab44",
                url: "https://www.netdata.cloud",
              },
            ],
          },
          {
            name: "Logs",
            icon: "scroll-text",
            tiles: [
              {
                name: "Loki",
                icon: "align-left",
                color: "#f5a623",
                url: "https://grafana.com/oss/loki",
              },
              {
                name: "Sentry",
                icon: "bug",
                color: "#362d59",
                url: "https://sentry.io",
              },
            ],
          },
        ],
      },
      {
        name: "Cloud",
        icon: "cloud",
        color: "#3b82f6",
        groups: [
          {
            name: "Provider",
            icon: "server",
            tiles: [
              {
                name: "Hetzner",
                icon: "server",
                color: "#d50c2d",
                url: "https://www.hetzner.com",
              },
              {
                name: "Cloudflare",
                icon: "cloud",
                color: "#f38020",
                url: "https://www.cloudflare.com",
              },
              {
                name: "AWS",
                icon: "cloud-cog",
                color: "#ff9900",
                url: "https://aws.amazon.com",
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
          {
            name: "Runbooks",
            icon: "clipboard-list",
            layout: "list",
            tiles: [
              {
                name: "Onboarding",
                icon: "user-plus",
                color: "#10b981",
                url: "https://example.com/onboarding",
                description: "Step-by-step onboarding",
              },
              {
                name: "Incident Response",
                icon: "alert-triangle",
                color: "#ef4444",
                url: "https://example.com/incidents",
                description: "What to do during outages",
              },
              {
                name: "Release-Checkliste",
                icon: "check-square",
                color: "#6366f1",
                url: "https://example.com/release",
                description: "Check before each deploy",
              },
            ],
          },
        ],
      },
    ],
  });
}
