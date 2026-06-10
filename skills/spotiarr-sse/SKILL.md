---
name: spotiarr-sse
description: "Trigger: SSE, server-sent events, real-time, useServerEvents, live updates, EventSource. spotiarr SSE pattern: frontend EventSource hook, backend AppEventBus, 4 event types."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Load when adding real-time updates, emitting new SSE events, or extending `useServerEvents`.

## Hard Rules

- Frontend: one SSE connection only — via `useServerEvents` (`hooks/useServerEvents.ts`). Never open additional `EventSource` instances.
- `useServerEvents` reacts to events by **invalidating TanStack Query caches** — NOT by writing to Zustand stores.
- No reconnection logic exists — if needed, add it inside `useServerEvents`, nowhere else.
- Backend: emit SSE events via `infrastructure/messaging/app-event-bus.ts` only. Never emit from controllers directly.
- `useServerEvents` must stay mounted inside the authenticated subtree under `<TokenGate>` (currently `AuthenticatedApp` in App.tsx). The `/api/events` SSE endpoint is gated by `require-token`; mounting SSE before unlock produces 401s. Never hoist `useServerEvents` above `<TokenGate>`.

## Event Contracts

| Event name                 | Frontend reaction                                                   |
| -------------------------- | ------------------------------------------------------------------- |
| `playlists-updated`        | invalidate `playlists`, `downloadStatus`, all `tracks[*]`           |
| `download-history-updated` | invalidate `downloadHistory`                                        |
| `library-updated`          | invalidate `libraryStats`, `libraryArtists`, all `libraryArtist[*]` |
| `feed-updated`             | invalidate `releases`, `followedArtists`                            |

## Adding a New SSE Event

1. **Backend**: emit via `app-event-bus.ts` with a new event name string
2. **Frontend**: add a listener in `useServerEvents.ts`, invalidate the relevant query keys from `queryKeys.ts`
3. **Shared**: if the event payload needs a typed shape, add it to `packages/shared/src/index.ts`

## References

- Frontend hook: `apps/frontend/src/hooks/useServerEvents.ts`
- Query keys: `apps/frontend/src/hooks/queryKeys.ts`
- Backend bus: `apps/backend/src/infrastructure/messaging/app-event-bus.ts`
- Backend controller: `apps/backend/src/presentation/controllers/events.controller.ts`
- Backend route: `apps/backend/src/presentation/routes/events.routes.ts`
