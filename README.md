# KanFlow

Self-hosted Kanban board application for internal server deployment.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + @hello-pangea/dnd
- **Backend**: NestJS 10 + Prisma + PostgreSQL 16 + Redis 7 + Socket.io
- **Infra**: Docker Compose + Nginx + pnpm workspace + Turbo

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env file
cp .env.example .env

# 3. Start dev infrastructure (PostgreSQL, Redis, MinIO)
pnpm docker:dev

# 4. Run database migrations
pnpm db:migrate

# 5. Start development servers
pnpm dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Swagger Docs: http://localhost:4000/api/docs

## Project Structure

```
apps/frontend/    → React SPA (Vite)
apps/backend/     → NestJS API server
  └── prisma/     → Schema & migrations
packages/shared/  → Shared types & Zod validation schemas
docker/dev/       → Dev infrastructure (PG, Redis, MinIO)
docker/prod/      → Production environment (Nginx reverse proxy)
scripts/hooks/    → Git/Claude hooks
docs/adr/         → Architecture Decision Records
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start frontend + backend |
| `pnpm build` | Production build |
| `pnpm test` | Run all tests |
| `pnpm lint` | ESLint check |
| `pnpm db:migrate` | Prisma migration (dev DB) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm docker:dev` | Start dev containers |
| `pnpm docker:prod` | Start prod containers |
| `pnpm docker:down` | Stop all containers |

## Documentation

- [FRD (Feature Requirements Document)](docs/FRD-v2.0-20260224.md)
- Architecture Decision Records: `docs/adr/`
