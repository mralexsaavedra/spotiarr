# AGENTS.md — Backend

Workspace: `apps/backend` · Node 22, Express, Prisma (SQLite), BullMQ, Redis

> Overrides root `AGENTS.md` on conflict. Root instructions still apply.

## Stack

- Node 22 + Express
- Prisma (SQLite via better-sqlite3, no driver adapter)
- BullMQ + Redis (async job processing)
- Zod (request validation at presentation boundary)
- FFmpeg + yt-dlp (media download/processing)
- Spotify API + Deezer + MusicBrainz (external clients)

## Structure

```
src/
├── container.ts         ← DI wiring — ALL classes registered here
├── app.ts / index.ts
├── domain/
│   ├── entities/        playlist.entity.ts, track.entity.ts
│   ├── errors/          app-error.ts
│   ├── events/          event-bus.ts (interface)
│   ├── repositories/    interfaces (history, playlist, settings, track)
│   └── services/        interfaces (spotify.service, track-queue.service)
├── application/
│   ├── use-cases/       artists/ history/ library/ playlists/ settings/ tracks/
│   └── services/        library, playlist, settings, track, track-post-processing
├── infrastructure/
│   ├── database/        prisma-*.repository.ts, feed.repository.ts
│   ├── external/        spotify-*.ts, DeezerClient, MusicBrainzClient, YoutubeDownload/Search
│   ├── messaging/       app-event-bus.ts, bullmq-track-queue.service.ts
│   ├── workers/         catalog-sync, feed-sync, track-download, track-search
│   ├── jobs/            catalog-sync.job.ts, feed-sync.job.ts
│   └── setup/           environment.ts, prisma.ts, queues.ts
└── presentation/
    ├── controllers/     artist, auth, events, feed, health, history, library, playlist, search, settings, track
    ├── middleware/      async-handler.ts, error-handler.ts, validate.ts
    └── routes/          *.routes.ts + schemas/
```

## Hard Rules

- DI container is `src/container.ts` — register every new class there in init order (infra → services → use-cases → controllers).
- Prisma calls ONLY in `infrastructure/database/`. Import the `prisma` singleton from `infrastructure/setup/prisma.ts`.
- Validate all request input with Zod schemas in `presentation/routes/schemas/` before controllers touch it.
- Never let Prisma errors escape to the presentation layer — map them in the repository.
- SSE events emitted via `infrastructure/messaging/app-event-bus.ts`, never directly from controllers.
- Environment access through `getEnv()` from `infrastructure/setup/environment.ts` — never `process.env` directly.

## Validation

```bash
pnpm --filter backend run lint
pnpm --filter backend run build
```

## Skills

| Trigger                            | Skill                     |
| ---------------------------------- | ------------------------- |
| Layer placement decisions          | `spotiarr-architecture`   |
| Express routes or middleware       | `nodejs-express-server`   |
| Prisma queries, schema, migrations | `spotiarr-prisma`         |
| BullMQ workers or queues           | `spotiarr-bullmq`         |
| SSE events                         | `spotiarr-sse`            |
| Backend services or REST APIs      | `nodejs-backend-patterns` |
| Zod schemas                        | `zod`                     |
