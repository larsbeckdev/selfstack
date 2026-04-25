 # Selfstack

**Selfstack** is a free and open-source, self-hosted dashboard builder for
organizing your bookmarks, services, and homelab tools into customizable
boards with categories, groups, and tiles — a lightweight alternative to
heavier homelab dashboards, designed to be deployed in a single container.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## Features

### Boards, categories, groups, tiles
- Multiple boards per user with drag-and-drop reordering (categories, groups, tiles, and boards themselves)
- Two layout modes per board: auto-flow grid and free placement
- Fixed tile sizes (small / default / large / list) that reflow responsively
- Per-tile, per-group, per-category background **and** border colors, with "border matches background" shortcut
- Icon picker with full Lucide library **or** upload your own PNG/SVG icons
- One-click **reset all colors** per board
- **Status ping** indicator per tile (HEAD → GET fallback, tolerates self-signed TLS for LAN services)

### Sharing & access control
- **Public boards** reachable via `/board/<username>/<slug>` (viewer-only)
- **Board members** with per-board roles: owner / editor / viewer
- **Organizations** to group users and share boards within a team (owner / admin / editor / member roles)
- Global roles: `user`, `editor` (edit any board), `admin` (full access)
- Copyable share link with app-URL awareness (works behind reverse proxies)

### Users & auth
- Session-based auth (JWT + bcrypt)
- **Two-factor authentication (TOTP)** — QR enrollment in settings, verification step on login
- Password reset / "must change password on next login" flow
- Registration can be toggled by admins
- Required unique **username**, used as URL prefix for the user's boards (`/board/maxmuster/dashboard`)
- Rename-your-username safely: owned board slugs are cascade-renamed in a transaction

### Theming
- Light / dark / system mode
- Multiple built-in color presets (Sunset Horizon, Ocean, Forest, …)
- Per-variable override (primary, background, accent, …) with a Figma-style color picker including shadcn/tailwind swatches
- Preferences stored per user, applied SSR-side to avoid flash

### i18n
- German and English UI, per-user locale

### Admin panel
- User CRUD with one-time password generation and welcome email
- **Organization management** (create, edit, add/remove members, change roles)
- **System health page** (DB, uploads, SMTP reachability, memory, uptime)
- System settings (registration toggle, public app URL, legal texts)
- **SMTP configuration UI** with test-email send
- Role management

### Demo mode
- Single-flag deployment (`NEXT_PUBLIC_DEMO_MODE=true`)
- Database is wiped + re-seeded with demo content on boot and every `DEMO_RESET_MINUTES` (default 60)
- All settings mutations are blocked server-side
- Bottom banner announces demo status, localized and reacts to the language toggle

### Privacy
- Sends `noindex, nofollow` headers and `/robots.txt` with `Disallow: /` by default
- Opt in to crawlers with `ALLOW_SEARCH_INDEXING="true"`

### Self-hosted
- SQLite database (better-sqlite3 adapter), no external services required
- Runs in a single container

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack, standalone output)
- [React 19](https://react.dev)
- [Prisma 6](https://www.prisma.io) + SQLite (via `@prisma/adapter-better-sqlite3`)
- [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS 4
- [dnd-kit](https://dndkit.com) for drag-and-drop
- [Lucide](https://lucide.dev) icons
- [otpauth](https://github.com/hectorm/otpauth) + [qrcode](https://github.com/soldair/node-qrcode) for 2FA
- [nodemailer](https://nodemailer.com) for transactional email
- [jose](https://github.com/panva/jose) for JWT, [bcryptjs](https://github.com/dcodeIO/bcrypt.js) for password hashing

## Quick start with Docker

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
survives container rebuilds. The entrypoint also repairs ownership on
boot, so bind-mounts (e.g. `./selfstack-data:/data`) work out of the
box if you prefer those for backups.

On every start the container runs `prisma db push` (idempotent schema
sync) and seeds an admin user on first boot — a fresh `docker compose
up -d --build` is enough, no manual migration step.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:/data/selfstack.db` | Prisma connection string. Use a path on the mounted `/data` volume. |
| `JWT_SECRET` | — | **Required.** Secret used to sign session tokens. |
| `SECURE_COOKIES` | *(unset)* | Set to `"true"` when serving over HTTPS. |
| `PORT` | `3026` | HTTP port inside the container. |
| `APP_URL` | *(unset)* | Public base URL (e.g. `https://dash.example.com`). Used for share links and email links. Can also be set in the admin UI. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` / `SMTP_SECURE` | *(unset)* | Fallback SMTP config. Admin UI values override env. |
| `ALLOW_SEARCH_INDEXING` | `false` | Set to `"true"` to drop the `noindex` meta tag and allow `/robots.txt` crawling. |
| `NEXT_PUBLIC_DEMO_MODE` | `false` | Set to `"true"` to enable demo mode (auto-reset + mutation lock). |
| `DEMO_RESET_MINUTES` | `60` | How often the demo database is wiped + re-seeded. |

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

## URL scheme

- `/dashboard` — user overview of all accessible boards
- `/board` — list of public boards
- `/board/<username>/<slug>` — a user's board (e.g. `/board/maxmuster/dashboard`)
- `/board/<orgslug>/<slug>` — an organization-owned board (e.g. `/board/acme/team`)
- `/board/<slug>` — admin-created system boards (no prefix)
- `/settings` · `/settings/appearance` · `/settings/account` · `/settings/boards`
- `/admin/users` · `/admin/organizations` · `/admin/settings` · `/admin/health` (admin only)

Public boards are reachable at the same path without authentication.

> **Note:** Board slugs cannot start with `@` — segments beginning with `@`
> are reserved by Next.js App Router for parallel route slots.

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated app routes
│   │   ├── board/[...slug] # Board view (supports username/slug paths)
│   │   ├── dashboard/      # Dashboard overview
│   │   ├── settings/       # User settings (general, appearance, account, boards)
│   │   ├── media/          # Uploaded icon management
│   │   └── admin/          # Admin panel (users, organizations, settings, health)
│   ├── (auth)/             # Login (with 2FA step) & register
│   ├── api/
│   │   ├── tile-status/    # Tile status ping endpoint
│   │   ├── media/          # Icon uploads
│   │   └── upload/         # Generic upload endpoint
│   └── change-password/    # Forced password change flow
├── components/
│   ├── dashboard/          # Board, category, group, tile components
│   ├── layout/             # Sidebar, header, layout-mode toggle
│   ├── settings/           # Settings pages & two-factor card
│   ├── admin/              # Admin-only components (user table, SMTP card)
│   ├── auth/               # Login / register / 2FA / change-password forms
│   ├── media/              # Media library
│   └── ui/                 # shadcn/ui components + color picker
├── lib/
│   ├── actions/            # Server actions (board, auth, settings)
│   ├── auth.ts             # Session & 2FA-pending cookie management
│   ├── totp.ts             # TOTP secret/QR/verify helpers
│   ├── email.ts            # SMTP transport (DB-backed with env fallback)
│   ├── db.ts               # Prisma client
│   ├── theme-presets.ts    # Built-in theme presets
│   ├── shadcn-palette.ts   # shadcn color swatches
│   └── i18n/               # Translations (de, en)
└── generated/prisma/       # Generated Prisma client
```

## Contributing

Issues and pull requests are welcome. If you are planning a larger change,
please open an issue first so we can discuss the direction.

## License

Selfstack is released under the [MIT License](./LICENSE).

