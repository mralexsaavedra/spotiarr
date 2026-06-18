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
- Vercel AI SDK (`generateObject`) — OpenAI-compatible adapter for AI playlist generation

## Structure

```
src/
├── container.ts         ← DI wiring — ALL classes registered here
├── app.ts / index.ts
├── constants/
├── domain/
│   ├── entities/        playlist.entity.ts, track.entity.ts
│   ├── errors/          app-error.ts
│   ├── events/          event-bus.ts (interface)
│   ├── helpers/         deezer-image.helper.ts, spotify-url.helper.ts
│   ├── repositories/    interfaces (ai-chat-message, history, playlist, settings, track)
│   ├── services/        interfaces (ai-playlist-queue.service, track-queue.service)
│   └── utils/           deezer-cover-url.ts
├── application/
│   ├── ports/           hexagonal contracts (interfaces)
│   ├── services/        artwork, feed-cache-eviction, health, library, playlist, settings, spotify, track-post-processing, track
│   ├── use-cases/       ai/ artists/ artwork-backfill/ external-url/ feed/ history/ library/ playlists/ settings/ tracks/
│   └── utils/
├── infrastructure/
│   ├── cache/
│   ├── database/        prisma-*.repository.ts, feed.repository.ts
│   ├── external/        YoutubeDownload/Search; providers/ (ai/, deezer/, musicbrainz/, spotify/, normalize-name.ts)
│   ├── logging/         pino logger
│   ├── messaging/       app-event-bus.ts, bullmq-track-queue.service.ts, bullmq-ai-playlist-queue.service.ts, bullmq-artwork-backfill-queue.service.ts
│   ├── services/
│   ├── workers/         ai-playlist, artwork-backfill, catalog-sync, feed-sync, track-download, track-search
│   ├── jobs/            catalog-sync.job.ts, feed-sync.job.ts, recover-errored-tracks.job.ts, index.ts
│   └── setup/           environment.ts, prisma.ts, queues.ts
├── testing/             playwright-real-stack-server.ts, logger.ts
└── presentation/
    ├── controllers/     ai, artist, artwork-backfill, auth, events, external-url, feed, health, history, library, playlist, search, settings, track
    ├── middleware/      async-handler.ts, cookie.ts, cors.ts, error-handler.ts, require-token.ts, validate.ts
    └── routes/          *.routes.ts + schemas/
```

## Hard Rules

- DI container is `src/container.ts` — register every new class there in init order (infra → services → use-cases → controllers).
- Prisma calls ONLY in `infrastructure/database/`. Import the `prisma` singleton from `infrastructure/setup/prisma.ts`.
- Validate all request input with Zod schemas in `presentation/routes/schemas/` before controllers touch it.
- Never let Prisma errors escape to the presentation layer — map them in the repository.
- SSE events emitted via `infrastructure/messaging/app-event-bus.ts`, never directly from controllers.
- Environment access through `getEnv()` from `infrastructure/setup/environment.ts` — never `process.env` directly.
- Instance token auth: `createRequireTokenMiddleware` is mounted at `ApiRoutes.BASE` before the API router. Public routes must be added to the allowlist in `presentation/middleware/require-token.ts` (currently POST /auth/unlock, GET /health, GET /auth/spotify/callback). GET /auth/session is intentionally NOT allowlisted.
- `app.set("trust proxy", ...)` is driven by `SPOTIARR_TRUST_PROXY`; it MUST be set behind a reverse proxy or `req.secure` (cookie Secure flag) and `req.ip` (rate-limit bucket) break.
- CORS is opt-in via `SPOTIARR_CORS_ORIGIN` (explicit origin allowlist, wildcard rejected). `cors()` is registered only when it is set; same-origin deployments get none. The SSE controller mirrors the policy through an injected allowlist getter — do NOT import `getEnv` into presentation; wire it from `container.ts`.
- AI provider config (`AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`) is stored in the DB `Setting` table, NOT in environment variables — do not add these keys to `environment.ts` or `getEnv()`.

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
