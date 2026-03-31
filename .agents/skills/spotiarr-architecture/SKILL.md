---
name: spotiarr-architecture
description: >
  Architecture reference for the Spotiarr monorepo across backend, frontend,
  and shared packages with layer boundaries and dependency rules.
  Trigger: When making architectural decisions, writing code across layers,
  adding new features, or understanding the repo structure in spotiarr.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

Use this skill when:

- You need to decide where new code belongs (backend domain/application/infrastructure/presentation, frontend views/hooks/services/store, or shared package).
- You are implementing a feature that touches multiple layers or both backend and frontend.
- You need to validate dependency direction and architectural boundaries before refactoring.

---

## Critical Patterns

### Pattern 1: Monorepo Topology

- Workspace model: **pnpm workspaces** with `apps/*` and `packages/*`.
- Primary app boundaries:
  - `apps/backend`
  - `apps/frontend`
  - `packages/shared`
- `packages/shared` is a cross-cutting contract layer (DTOs, enums, utilities) and impacts both apps.

### Pattern 2: Backend Layering (Clean Architecture / DDD-lite)

Backend stack:

- Express + Prisma + BullMQ + Redis + Zod

Layer responsibilities:

- `domain/`: core business rules, no external deps.
- `application/`: use cases and services orchestrating domain behavior.
- `infrastructure/`: adapters for DB, external APIs, queues, filesystem.
- `presentation/`: routes, controllers, middleware, SSE endpoints.

Dependency rule:

- Dependencies point inward.
- `presentation -> application -> domain`
- `infrastructure` implements contracts for inner layers.

ASCII dependency view:

```text
   [presentation]
         |
         v
    [application]
         |
         v
       [domain]

[infrastructure] --implements--> (contracts used by application/domain)
```

### Pattern 3: Frontend Layering and State Boundaries

Frontend stack:

- React 19 + Vite + React Router + TanStack Query + Zustand + Tailwind 4

Organization:

- `components/` (atoms, molecules, organisms, layouts)
- `views/`
- `hooks/`
- `services/`
- `store/`

Placement rules:

- Keep view logic in `hooks/` (controller-style hooks), not in rendering components.
- Keep server state in `hooks/queries` and `hooks/mutations`.
- Use SSE synchronization via `useServerEvents` for real-time updates.

### Pattern 4: Cross-Layer Conventions

- TypeScript remains strict (`strict: true`).
- Import order:
  1. third-party
  2. aliases (`@/...`)
  3. relative
- Frontend conventions:
  - Functional components + hooks.
  - Use `cn()` for conditional classes.
  - Keep complex logic outside views.
- Backend conventions:
  - Input validation with Zod.
  - Centralized error handling via middleware.
  - Dependency injection via `container.ts`.
- Prefer explicit naming and consistency with existing structure.

---

## Decision Tree

```text
Adding business rule or core invariant?      → apps/backend/domain/
Coordinating use-cases/services?             → apps/backend/application/
Talking to DB/queues/APIs/filesystem?        → apps/backend/infrastructure/
Handling HTTP routes/controllers/SSE?        → apps/backend/presentation/

Creating UI composition elements?            → apps/frontend/components/
Building page-level route screens?           → apps/frontend/views/
Managing UI/view logic orchestration?        → apps/frontend/hooks/
Integrating remote/server operations?        → apps/frontend/services/ + hooks/queries|mutations
Managing app/client state lifecycle?         → apps/frontend/store/

Sharing DTOs/enums/utilities across apps?    → packages/shared/
```

---

## Code Examples

### Example 1: Backend placement check

```text
Feature: "Mark download as completed and notify clients"

- Completion rule/invariant                   -> domain/
- Orchestrate completion flow                 -> application/
- Persist status with Prisma, enqueue jobs    -> infrastructure/
- Expose endpoint + SSE event                 -> presentation/
```

### Example 2: Frontend placement check

```text
Feature: "Live downloads dashboard"

- Screen shell and layout                      -> views/ + components/
- User interaction and derived UI logic        -> hooks/
- Fetch/mutate downloads from backend          -> hooks/queries + hooks/mutations + services/
- Subscribe to real-time server events         -> useServerEvents
- Shared API response contracts/types          -> packages/shared/
```

---

## Commands

```bash
# No commands in this skill by design.
# This skill is architecture-focused (boundaries, layering, placement).
```

---

## Resources

- **Documentation**: Architecture and conventions sourced from `AGENTS.md` at repository root.
