# Selfstack

A self-hosted dashboard builder for organizing your bookmarks, services, and tools into customizable boards with categories, groups, and tiles.

## Features

- **Board Management** — Create multiple boards with drag-and-drop categories, groups, and tiles
- **Public Boards** — Share boards publicly via readable slug URLs (`/b/my-board`)
- **Theming** — Light/dark mode with customizable color presets per user
- **i18n** — German and English interface with per-user locale setting
- **Admin Panel** — User management and system settings (e.g. registration toggle)
- **Authentication** — Session-based auth with JWT, bcrypt password hashing
- **Responsive** — Mobile-first design with sidebar navigation
- **Self-hosted** — SQLite database, no external services required

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- [React 19](https://react.dev)
- [Prisma 6](https://www.prisma.io) + SQLite (via better-sqlite3 adapter)
- [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS 4
- [dnd-kit](https://dndkit.com) for drag-and-drop
- [Lucide](https://lucide.dev) icons

## Getting Started

### Prerequisites

- Node.js 20+
- npm / pnpm / yarn

### Installation

```bash
git clone https://github.com/larsbeckdev/selfstack.git
cd selfstack
npm install
```

### Environment

Copy `.env` and adjust as needed:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-this-to-a-random-secret-in-production"
# SECURE_COOKIES="true"  # Enable for HTTPS deployments
```

### Database Setup

```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

This creates the SQLite database and seeds an admin user:

| Email | Password |
|---|---|
| `admin@selfstack.local` | `admin123` |

### Development

```bash
npm run dev
```

Open [http://localhost:3025](http://localhost:3025)

### Production

```bash
npm run build
npm start
```

Runs on port 3026 by default.

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

## License

Private
