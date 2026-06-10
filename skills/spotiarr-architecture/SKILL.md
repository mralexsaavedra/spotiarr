---
name: spotiarr-architecture
description: "Trigger: architecture, layer, placement, where does X go, new feature, repo structure. spotiarr layer rules: backend DDD-lite, frontend hooks/store/views."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Load when deciding where new code belongs across backend, frontend, or shared.

## Hard Rules

- Dependencies point inward: `presentation → application → domain`; `infrastructure` implements inner-layer contracts — never the reverse.
- Prisma, Redis, yt-dlp, external HTTP → `infrastructure/` only. Never in `domain/` or `presentation/`.
- All use-cases and services register at: `apps/backend/src/container.ts` (NOT in `infrastructure/` — it's at `src/` root).
- Server state in frontend → TanStack Query (`hooks/queries`, `hooks/mutations`). Client state → Zustand slices under `store/` (one file per domain).
- Real-time SSE sync → `useServerEvents` hook. Do not add manual SSE subscriptions elsewhere.
- Shared DTOs, enums, utilities → `packages/shared/`. Never duplicate in apps.
- All Spotify HTTP calls must go through `CircuitBreaker.execute()` (`infrastructure/external/circuit-breaker.ts`). Never add a raw Spotify HTTP call without wrapping it. The circuit persists open state via `onOpen` callback → settings → restored on restart.

## Decision Gates

```
Backend — where does it go?
  Business rule / invariant?         → domain/
  Use-case orchestration?            → application/
  DB, queues, APIs, filesystem?      → infrastructure/
  HTTP routes, controllers, SSE?     → presentation/
  Cross-cutting request guards?      → presentation/middleware/

Frontend — where does it go?
  UI rendering / composition?        → components/
  Page-level screens?                → views/
  View logic / orchestration?        → hooks/
  Remote fetch / mutate?             → services/ + hooks/queries|mutations
  App-wide client state?             → store/
  Ephemeral gate/overlay state?      → local useState in the controller hook (NOT a Zustand store; see useTokenGate)

Cross-cutting types / utils?         → packages/shared/
```

## References

- DI container: `apps/backend/src/container.ts`
- Store pattern: `apps/frontend/src/store/`
- Request guards: `apps/backend/src/presentation/middleware/`
- Auth gate hook: `apps/frontend/src/hooks/controllers/useTokenGate.ts`
