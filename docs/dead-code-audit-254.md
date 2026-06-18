# Dead Code Audit — Issue #254

## Scope

Audit `apps/frontend`, `apps/backend`, and `packages/shared` for unused modules, exports, and dependency candidates.

## Tools used

- GitHub issue API for issue scope verification.
- `knip` for unused files, exports, and dependency candidates.
- `ts-prune` for exported TypeScript symbols.
- `oxlint` for lint-level unused checks.
- `git grep` checks before removal.

## Removed in this batch

### Frontend

- `apps/frontend/src/components/molecules/PlaylistCard.tsx`
- `apps/frontend/src/components/molecules/PlaylistCard.test.tsx`
- `apps/frontend/src/components/molecules/PlaylistStatusBadge.tsx`
- `apps/frontend/src/components/molecules/PlaylistStatusBadge.test.tsx`

These were only referenced by their own tests or by each other. Similar live components such as `HomePlaylistCard` and `SpotifyPlaylistCard` were left untouched.

### Backend

- `apps/backend/src/application/ports/artist-lookup.port.ts`
- `apps/backend/src/infrastructure/database/prisma-errors.ts`
- `apps/backend/src/infrastructure/database/prisma-errors.test.ts`
- `apps/backend/src/infrastructure/external/index.ts`
- `apps/backend/src/infrastructure/services/noop-spotify-artwork-source.service.ts`
- `apps/backend/src/infrastructure/services/noop-spotify-artwork-source.service.test.ts`

The Prisma helper wrapper was dead; live code imports `isPrismaUniqueViolation` directly from `application/utils/prisma-error.utils`.

### Shared

- `packages/shared/src/identity.test.ts`
- `GenerateAiPlaylistRequest` export from `packages/shared/src/index.ts`
- `UnlockRequestDto` export from `packages/shared/src/index.ts`

`identity.test.ts` was compiled as source but not executed by a shared test script.

## Additional export cleanup

After the first removal batch, `knip` and `ts-prune` were run again. The second pass converted internal-only exports to private declarations and removed one unused helper:

- `apps/backend/src/container.ts` — `createContainer` is now internal; `initializeContainer` remains the public entry point.
- `apps/backend/src/infrastructure/external/cache.types.ts` — removed unused `createCacheEntry`.
- Backend internal-only exported types/constants were made private in health, file-system, image, Spotify, MusicBrainz, jobs, track, artist catalog, and database type modules.
- Frontend internal-only exported types were made private in Toast context, player store, playlist components/controllers, and transport controls.

## Explicitly left untouched

- `apps/frontend/tests/helpers/real-stack.ts`: used by `apps/frontend/playwright.config.ts` as the real-stack web server command.
- `apps/backend/src/testing/playwright-real-stack-server.ts`: loaded dynamically by the frontend real-stack helper through `dist/testing/playwright-real-stack-server.js`.
- `apps/backend/src/infrastructure/external/youtube-binary.ts`: `which` is a shell binary usage, not an npm dependency candidate.
- `@spotiarr/tsconfig`: used by workspace `tsconfig.json` files via `extends`.
- `prettier-plugin-tailwindcss`: used by `prettier.config.cjs`.
- `pino-pretty`: used by the backend logger transport in development/test.
- Public shared DTOs/types in `packages/shared/src/index.ts`: retained when consumed across workspaces or documented as shared API.

## Final residue check

After the expanded cleanup, `knip` only reports retained false positives/tooling entries:

- `apps/frontend/tests/helpers/real-stack.ts` — invoked by `apps/frontend/playwright.config.ts`.
- `apps/backend/src/testing/playwright-real-stack-server.ts` — loaded dynamically by the frontend real-stack helper from backend `dist`.
- `prettier-plugin-tailwindcss` — configured in `prettier.config.cjs`.
- `@spotiarr/tsconfig` — referenced by workspace `tsconfig.json` files.
- `pino-pretty` — backend logger development/test transport.
- `apps/backend/src/infrastructure/external/youtube-binary.ts` / `which` — shell binary lookup, not an npm dependency.

`ts-prune` still reports public shared DTOs and declarations marked `used in module`; these are retained because they are either consumed across workspaces, exported as shared API, or generated `dist` output.

## Validation

Project `pnpm --filter ...` scripts hit a local `spawn EPERM` sandbox issue, so equivalent direct workspace commands were used.

### Frontend

```bash
cd apps/frontend
OPENSSL_CONF=/dev/null ../../node_modules/.bin/oxlint src --ignore-path ../../.gitignore
OPENSSL_CONF=/dev/null ../../node_modules/.bin/vitest run
OPENSSL_CONF=/dev/null ../../node_modules/.bin/tsc
OPENSSL_CONF=/dev/null ../../node_modules/.bin/vite build
```

Result: passed. Vitest reported 194 files / 1428 tests passed. Oxlint only reported pre-existing warnings.

### Backend

```bash
cd apps/backend
OPENSSL_CONF=/dev/null ../../node_modules/.bin/oxlint src
OPENSSL_CONF=/dev/null ../../node_modules/.bin/vitest run
OPENSSL_CONF=/dev/null ../../node_modules/.bin/prisma generate
OPENSSL_CONF=/dev/null ../../node_modules/.bin/tsc -p tsconfig.build.json
OPENSSL_CONF=/dev/null ../../node_modules/.bin/tsc-alias -p tsconfig.build.json
```

Result: passed. Vitest reported 169 files / 1834 tests passed. Oxlint only reported pre-existing warnings.

### Shared

```bash
cd packages/shared
OPENSSL_CONF=/dev/null ../../node_modules/.bin/oxlint src
OPENSSL_CONF=/dev/null ../../node_modules/.bin/tsc
```

Result: passed.
