---
name: spotiarr-prisma
description: >
  Prisma ORM patterns for Spotiarr's SQLite-backed backend.
  Trigger: When writing database queries, migrations, or Prisma schemas.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

Use this skill when:

- Editing Prisma schema or model relations.
- Writing repository/database adapter code with Prisma Client.
- Running migrations or regenerating Prisma Client.
- Handling DB-layer errors (unique constraint, not found, foreign key, etc.).

---

## Critical Patterns

### Pattern 1: Canonical Schema Location

- Prisma schema lives at: `apps/backend/prisma/schema.prisma`
- This backend uses a **SQLite datasource** — no driver adapter, standard `PrismaClient`.
- Singleton instance: `apps/backend/src/infrastructure/setup/prisma.ts` → `export const prisma = new PrismaClient()`
- Import in repositories: `import { prisma } from "../setup/prisma"`
- Keep schema updates and generated client in sync.

### Pattern 2: Clean Architecture Boundary

- Prisma calls belong in backend infrastructure database adapters only.
- Place Prisma access under: `apps/backend/src/infrastructure/database/`
- Never call Prisma directly from:
  - `domain/`
  - `presentation/`

Dependency intent:

```text
presentation -> application -> domain
infrastructure/database (Prisma) implements persistence contracts
```

### Pattern 3: Typed Inputs from Zod

- Validate input at boundaries with Zod.
- Pass **typed parsed inputs** to repository methods and Prisma calls.
- Avoid raw/unvalidated request payloads reaching Prisma.

Example flow:

```text
HTTP request -> Zod parse -> typed DTO/input -> repository -> Prisma Client
```

### Pattern 4: Migrations and Client Generation

Use these project commands:

```bash
pnpm --filter backend run prisma:migrate:deploy
pnpm --filter backend run prisma:generate
```

Run generation after schema changes. Run deploy migrations in environments where migration artifacts are already authored.

### Pattern 5: Transactions (When Needed)

- Use Prisma transactions when multiple writes must succeed/fail atomically.
- Prefer passing a transaction client through repository methods for multi-step workflows.
- Keep transaction scope tight and avoid long-running logic inside transaction blocks.

### Pattern 6: Error Handling

- Map known Prisma errors to application-safe errors.
- Handle common cases explicitly:
  - Unique constraint violation (e.g., duplicate value)
  - Not found conditions (`P2025`)
  - Foreign key/relation constraint violations
- Do not leak raw database internals to presentation responses.

Real P2025 guard pattern (from `prisma-settings.repository.ts`):

```ts
const isPrismaNotFoundError = (error: unknown): error is { code: string } =>
  error instanceof Error && "code" in error && error.code === "P2025";
```

---

## Code Examples

### Repository skeleton

```ts
// apps/backend/src/infrastructure/database/settings.repository.ts
import { prisma } from "../setup/prisma";

export class PrismaSettingsRepository implements ISettingsRepository {
  async findByKey(key: string) {
    return prisma.setting.findUnique({ where: { key } });
  }

  async upsert(key: string, value: string) {
    try {
      return await prisma.setting.update({ where: { key }, data: { value } });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        return prisma.setting.create({ data: { key, value } });
      }
      throw error;
    }
  }
}

const isPrismaNotFoundError = (error: unknown): error is { code: string } =>
  error instanceof Error && "code" in error && error.code === "P2025";
```

### Layer violation (avoid)

```ts
// apps/backend/src/domain/...            ❌ no Prisma imports
// apps/backend/src/presentation/...      ❌ no direct Prisma calls
```

---

## Commands

```bash
# Apply already-authored migrations
pnpm --filter backend run prisma:migrate:deploy

# Regenerate Prisma client after schema changes
pnpm --filter backend run prisma:generate
```

---

## Resources

- **Schema**: `apps/backend/prisma/schema.prisma`
