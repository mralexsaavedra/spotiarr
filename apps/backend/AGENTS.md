# AGENTS.md — Backend

Workspace: `apps/backend` · Node 22, Express, Prisma (SQLite), BullMQ, Redis

> Overrides root `AGENTS.md` on conflict. Root instructions still apply.

## Stack

- Node 22 + Express
- Prisma (SQLite via better-sqlite3)
- BullMQ + Redis (job queues)
- Zod (validation)
- FFmpeg + yt-dlp (media processing)

## Validation

```bash
pnpm --filter backend run lint
pnpm --filter backend run build
```

## Key paths

- `src/` — application source
- `prisma/` — Prisma schema and migrations

## Skills (backend-specific)

Load before working in this workspace:

| Trigger                            | Skill                     |
| ---------------------------------- | ------------------------- |
| Express routes or middleware       | `nodejs-express-server`   |
| Prisma queries, schema, migrations | `spotiarr-prisma`         |
| BullMQ workers or queues           | `spotiarr-bullmq`         |
| Backend services or REST APIs      | `nodejs-backend-patterns` |
| Zod schemas                        | `zod`                     |
