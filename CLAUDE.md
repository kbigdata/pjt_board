# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KanFlow is a self-hosted Kanban board application for internal server deployment. Solo-developed with Claude Code, Docker-based operations. The FRD is at `KanFlow-FRD-ClaudeCode-Setup-v2.0-20260224.md`.

## Tech Stack

- **Frontend**: React 18.3 + TypeScript 5.5 + Vite 5.4
  - UI: Tailwind CSS 3.4 + shadcn/ui
  - DnD: @hello-pangea/dnd 17.x
  - State: TanStack Query 5.x (server) + Zustand 4.5 (client)
  - Real-time: Socket.io-client 4.7
  - Forms: React Hook Form 7.x + Zod 3.x
- **Backend**: NestJS 10.x + TypeScript 5.5
  - ORM: Prisma 5.x + PostgreSQL 16
  - Cache: Redis 7.x
  - Auth: JWT (Passport.js)
  - File storage: MinIO (S3-compatible)
  - Real-time: Socket.io 4.7
  - API docs: @nestjs/swagger 7.x
- **Infra**: Docker Compose, Nginx, pnpm workspace, Turbo

## Monorepo Structure

```
apps/frontend/    → React SPA (Vite)
apps/backend/     → NestJS API server
  └── prisma/     → Schema & migrations
packages/shared/  → Shared types & Zod validation schemas
docker/dev/       → Dev infrastructure (PG, Redis, MinIO)
docker/prod/      → Production environment (Nginx reverse proxy)
scripts/hooks/    → Git/Claude hooks (lint, dangerous command blocking)
docs/adr/         → Architecture Decision Records
```

## Commands

```bash
pnpm dev              # Start frontend (:3000) + backend (:4000)
pnpm dev:frontend     # Frontend only
pnpm dev:backend      # Backend only
pnpm build            # Production build
pnpm test             # Run all tests (Jest)
pnpm test:watch       # Watch mode
pnpm lint             # ESLint check
pnpm lint:fix         # ESLint + Prettier auto-fix
pnpm db:migrate       # Prisma migration (dev DB :5433)
pnpm db:migrate:prod  # Prisma migration (prod DB :5432)
pnpm db:seed          # Seed test data
pnpm db:studio        # Prisma Studio
pnpm docker:dev       # Start dev infra (PG, Redis, MinIO)
pnpm docker:prod      # Full production environment
pnpm docker:down      # Stop containers
```

## Dev/Prod Port Separation (Same Server)

| Service    | Dev   | Prod  |
|------------|-------|-------|
| Frontend   | :3000 | -     |
| Backend    | :4000 | :4000 |
| PostgreSQL | :5433 | :5432 |
| Redis      | :6380 | :6379 |
| MinIO      | :9000 | -     |
| Nginx      | -     | :80   |

**Never mix dev and prod databases.** Always run Prisma migrations on dev DB (:5433) first.

## Architecture

### Backend (NestJS) Module Pattern

Each feature lives in `apps/backend/src/modules/<name>/`:
```
<name>.module.ts
<name>.controller.ts
<name>.service.ts
<name>.gateway.ts          # WebSocket, if needed
dto/
  create-<name>.dto.ts
  update-<name>.dto.ts
```

- Controllers: `@ApiTags` + `@ApiOperation` + `@ApiResponse` on every endpoint, `@UseGuards(JwtAuthGuard)` for auth, DTOs for input validation
- Services: `PrismaService` injection, `prisma.$transaction()` for complex ops, throw `NotFoundException`/`BadRequestException` etc.
- DTOs: `class-validator` decorators, `PartialType(CreateDto)` for update DTOs

### Frontend Component Pattern

- Functional components + hooks only
- No inline `style={}` — use Tailwind utilities
- Custom hooks for API calls (TanStack Query)
- Zustand stores for client-only state
- Socket.io client for real-time board sync

### Implementation Order for New Features

1. `packages/shared/` — type/interface definitions
2. `apps/backend/` — Prisma schema → migration → Service → Controller → DTO
3. `apps/frontend/` — API client hook → component
4. Tests

### Drag & Drop: Fractional Indexing

All position fields (cards, columns, swimlanes) use fractional indexing:
- `newPosition = (posA + posB) / 2`
- Avoids cascading position updates on every drag
- Automatic rebalancing when precision drops below 0.001

### Real-time Updates

- Optimistic UI updates on the client
- API call fires in background
- Rollback on failure
- WebSocket via Redis Pub/Sub

### Core Entities

Workspace → Board → Column/Swimlane → Card. Cards have: labels, assignees, priority, dates, checklists, attachments, comments, custom fields, tags, auto-increment number (KF-001).

## Coding Rules

1. TypeScript strict mode
2. Swagger decorators on all API endpoints
3. Unit tests for service logic (Jest)
4. Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
5. Branching: `main` → `develop` → `feature/*`
6. Position fields use fractional indexing
7. Errors use NestJS HttpException hierarchy
8. DB access only through Prisma Client
9. File uploads go to MinIO — never save directly to local disk
10. No `console.log` in production code — use NestJS Logger

## Subagent Workflow

The project uses 4 subagents in a pipeline for feature development:
1. **researcher** — read-only codebase analysis, pattern discovery
2. **architect** — API/DB/component design, writes ADRs to `docs/adr/`
3. **implementer** — full-stack implementation following architect's design
4. **reviewer** — read-only code review (type safety, security, performance, consistency)

Delegate large investigation tasks to subagents to preserve main context window.
