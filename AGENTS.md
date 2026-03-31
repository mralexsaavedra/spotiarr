# AGENTS.md

Instructions for coding agents working in `spotiarr`.

## 1) Quick start

- Monorepo: **pnpm workspaces** (`apps/*`, `packages/*`)
- Runtime: Node `22` (see `.nvmrc`), pnpm `>=10`

```bash
nvm use
corepack enable
pnpm install
```

External services: Redis, FFmpeg, yt-dlp, Python 3.11/3.12.

---

## 2) Agent checklist

**Before starting:**

- Confirm scope (backend, frontend, shared, or cross-workspace).
- Keep changes minimal and focused on the objective.
- Do not edit unrelated files.
- Never commit secrets (`.env`, tokens, credentials).
- Use `gh` for GitHub operations (PRs, checks, comments).
- Preserve layered architecture and controllers/hooks patterns.

**Before finishing:**

- Run **targeted** validation for affected workspaces.
- If the change is broad, run full-repo validation.
- Update docs if flows, commands, or conventions changed.

---

## 3) Skill routing

| Task                                        | Skill                         |
| ------------------------------------------- | ----------------------------- |
| TypeScript types/interfaces/generics        | `typescript`                  |
| React 19 components and patterns            | `react-19`                    |
| Tailwind v4 styling                         | `tailwind-4`                  |
| Schema validation (API/env) with Zod        | `zod-4`                       |
| Global state with Zustand                   | `zustand-5`                   |
| React rendering/performance work            | `vercel-react-best-practices` |
| High-quality UI construction                | `frontend-design`             |
| UX/visual accessibility audits              | `web-design-guidelines`       |
| E2E testing                                 | `playwright`                  |
| Commands, validation, PR workflow, branches | `spotiarr-workflow`           |
| Architecture, layers, conventions           | `spotiarr-architecture`       |
| Multi-agent compatibility setup             | `spotiarr-compatibility`      |
| Prisma queries, migrations, schemas         | `spotiarr-prisma`             |

For medium/large changes use the SDD flow. Full skill paths: see `.atl/skill-registry.md`.
