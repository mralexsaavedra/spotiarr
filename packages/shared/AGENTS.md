# AGENTS.md — Shared

Workspace: `packages/shared` · DTOs, enums, shared utilities

> Overrides root `AGENTS.md` on conflict. Root instructions still apply.

## What lives here

Two files only:

- `src/index.ts` — all shared exports (enums, DTOs, interfaces, API response types)
- `src/routes.ts` — `ApiRoutes` constants

**Enums:** `PlaylistTypeEnum` · `TrackStatusEnum` · `PlaylistStatusEnum` · `ApiErrorCode` · `APP_LOCALES` · `SUPPORTED_AUDIO_FORMATS`

**API shapes:** `ApiErrorShape` · `ApiSuccess<T>` · `ApiResponse<T>`

**Domain interfaces:** `ITrack` · `IPlaylist` · `ArtistRelease` · `ArtistDetail` · `FollowedArtist` · `LibraryTrack` · `LibraryAlbum` · `LibraryArtist` · `SettingItem` · `SettingMetadata`

**Request/Response DTOs:** `CreatePlaylistRequest` · `DownloadStatusResponse` · `DownloadHistoryItem` · `SpotifySearchResults` · `LibraryScanResult`

## Hard Rules

- Zero runtime dependencies — pure TypeScript types and re-exports only.
- Never add logic or utilities that import Node.js builtins or browser APIs.
- Changing or removing an export is a breaking change for both apps — run broad validation after any edit.
- Adding a new enum value to `TrackStatusEnum`, `PlaylistStatusEnum`, or `ApiErrorCode` requires updating all switch/match exhaustiveness checks in both apps.

## Validation

```bash
pnpm --filter @spotiarr/shared run lint
pnpm --filter @spotiarr/shared run build
pnpm lint && pnpm build    # always run broad after shared changes
```

## Skills

| Trigger                                | Skill                       |
| -------------------------------------- | --------------------------- |
| TypeScript types, interfaces, generics | `typescript-advanced-types` |
| Zod schemas for DTOs                   | `zod`                       |
