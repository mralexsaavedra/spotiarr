# AGENTS.md — Frontend

Workspace: `apps/frontend` · React 19, Vite, TanStack Query, Zustand, Tailwind 4

> Overrides root `AGENTS.md` on conflict. Root instructions still apply.

## Stack

- React 19 with React Compiler
- Vite (bundler)
- TanStack Query v5 (server state)
- Zustand (client state)
- Tailwind CSS v4

## Validation

```bash
pnpm --filter frontend run lint
pnpm --filter frontend run build
```

## Key paths

- `src/` — application source
- `src/components/` — UI components
- `src/hooks/` — custom hooks
- `src/pages/` — page-level components

## Skills (frontend-specific)

Load before working in this workspace:

| Trigger                       | Skill                         |
| ----------------------------- | ----------------------------- |
| React components or hooks     | `react-best-practices`        |
| Tailwind CSS styling          | `tailwind-css-patterns`       |
| TanStack Query, data fetching | `vercel-react-best-practices` |
| UI components or pages        | `frontend-design`             |
| Vite config                   | `vite`                        |
| Accessibility                 | `accessibility`               |
| TypeScript types              | `typescript-advanced-types`   |
