---
name: spotiarr-prisma
description: "Trigger: Prisma, database, migration, schema, repository, query. SQLite Prisma patterns for spotiarr: boundaries, error handling, commands."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Load when editing Prisma schema, writing repository code, running migrations, or handling DB errors.

## Hard Rules

- Prisma calls belong in `apps/backend/src/infrastructure/database/` **only**. Never in `domain/` or `presentation/`.
- Singleton: `apps/backend/src/infrastructure/setup/prisma.ts` → import from there, never instantiate `PrismaClient` elsewhere.
- Always validate input with Zod before passing to Prisma. Flow: `HTTP request → Zod parse → typed DTO → repository → Prisma`.
- Map Prisma errors to application errors — never let raw DB errors reach the presentation layer.
- Use transactions when multiple writes must succeed/fail atomically. Keep transaction scope tight.

## Decision Gates

| Error                 | Handling                                              |
| --------------------- | ----------------------------------------------------- |
| `P2025` (not found)   | Guard with `isPrismaNotFoundError`, handle gracefully |
| Unique constraint     | Catch and map to domain conflict error                |
| Foreign key violation | Map to application-level validation error             |

```ts
const isPrismaNotFoundError = (e: unknown): e is { code: string } =>
  e instanceof Error && "code" in e && e.code === "P2025";
```

## Execution Steps

After schema changes:

```bash
pnpm --filter backend run prisma:generate          # regenerate client
pnpm --filter backend run prisma:migrate:deploy    # apply migrations
```

## References

- Schema: `apps/backend/prisma/schema.prisma`
- Singleton: `apps/backend/src/infrastructure/setup/prisma.ts`
- Repository example: `apps/backend/src/infrastructure/database/`
