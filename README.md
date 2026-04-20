# Selfstack

**Selfstack** is a free and open-source, self-hosted dashboard builder for
organizing your bookmarks, services, and homelab tools into customizable
boards with categories, groups, and tiles — a lightweight alternative to
heavier homelab dashboards, designed to be deployed in a single container.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## Features

- **Board Management** — Create multiple boards with drag-and-drop categories, groups, and tiles
- **Responsive grid system** — Fixed tile sizes (small / default / large / list) that reflow to the viewport
- **Group background colors** — Pick from the shadcn/tailwind palette, theme-aware
- **Public Boards** — Share boards publicly via readable slug URLs (`/b/my-board`)
- **Theming** — Light/dark mode with customizable color presets per user
- **i18n** — German and English interface with per-user locale setting
- **Admin Panel** — User management and system settings (e.g. registration toggle)
- **Authentication** — Session-based auth with JWT, bcrypt password hashing
- **Self-hosted** — SQLite database, no external services required

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack, standalone output)
- [React 19](https://react.dev)
- [Prisma 6](https://www.prisma.io) + SQLite (via better-sqlite3 adapter)
- [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS 4
- [dnd-kit](https://dndkit.com) for drag-and-drop
- [Lucide](https://lucide.dev) icons

## Quick start with Docker

The simplest way to run Selfstack:

```bash
git clone https://github.com/larsbeckdev/selfstack.git
cd selfstack

# Generate a secret and start the container
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
docker compose up -d --build
```

Open <http://localhost:3026> and sign in with the seeded admin:

| Email | Password |
|---|---|
| `admin@selfstack.local` | `admin123` |

**Change the admin password immediately** after first login.

Data is stored in two named volumes (`selfstack-data` for the SQLite
database, `selfstack-uploads` for user-uploaded icons) so your content
survives container rebuilds.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:/data/selfstack.db` | Prisma connection string. Use a path on the mounted `/data` volume. |
| `JWT_SECRET` | — | Required. Secret used to sign session tokens. |
| `SECURE_COOKIES` | *(unset)* | Set to `"true"` when serving over HTTPS. |
| `PORT` | `3026` | HTTP port inside the container. |

## Local development (without Docker)

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
git clone https://github.com/larsbeckdev/selfstack.git
cd selfstack
cp .env.example .env
npm install
```

### Database setup

```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

### Run

```bash
npm run dev
```

Open <http://localhost:3025>.

### Production build

```bash
npm run build
npm start
```

Runs on port 3026.

## Project Structure

```
src/
├── app/
│   ├── (app)/          # Authenticated app routes
│   │   ├── board/      # Board view (/board/[slug])
│   │   ├── dashboard/  # Dashboard overview
│   │   ├── settings/   # User settings
│   │   └── admin/      # Admin panel
│   ├── (auth)/         # Login & register
│   └── (public)/       # Public board pages (/b/[slug])
├── components/
│   ├── dashboard/      # Board, category, group, tile components
│   ├── layout/         # Sidebar, header
│   ├── settings/       # Settings pages
│   └── ui/             # shadcn/ui components
├── lib/
│   ├── actions/        # Server actions (board, auth, settings)
│   ├── auth.ts         # Session management
│   ├── db.ts           # Prisma client
│   └── i18n/           # Translations (de, en)
└── generated/prisma/   # Generated Prisma client
```

## Contributing

Issues and pull requests are welcome. If you are planning a larger change,
please open an issue first so we can discuss the direction.

## License

Selfstack is released under the [MIT License](./LICENSE).
