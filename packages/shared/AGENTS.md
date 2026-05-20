# AGENTS.md — Shared

Workspace: `packages/shared` · DTOs, enums, shared utilities

> Overrides root `AGENTS.md` on conflict. Root instructions still apply.

## Validation

```bash
pnpm --filter @spotiarr/shared run lint
pnpm --filter @spotiarr/shared run build
```

## Rules

- No runtime dependencies — pure TypeScript types and utilities only
- Changes here may require updates in both `apps/frontend` and `apps/backend`
- Always run broad validation (`pnpm lint && pnpm build`) after modifying shared

## Skills

| Trigger                | Skill                       |
| ---------------------- | --------------------------- |
| TypeScript types, DTOs | `typescript-advanced-types` |
| Zod schemas            | `zod`                       |
