# AGENTS.md

Instructions for coding agents working in `spotiarr`.

## 1) Quick start

- Monorepo: **pnpm workspaces** (`apps/*`, `packages/*`)
- Recommended runtime:
  - Node: use `.nvmrc` (currently `22`)
  - pnpm: `>=10` recommended (current engine: `>=9`; packageManager `pnpm@10.20.0`)

From the repository root:

```bash
nvm use
corepack enable
pnpm install
```

External services needed for local development:

- Redis
- FFmpeg
- yt-dlp
- Python 3.11/3.12

---

## 2) Quick agent checklist

Before starting:

- Confirm scope (backend, frontend, shared, or cross-workspace).
- Keep changes minimal and focused on the objective.
- Do not edit unrelated files.
- Never commit secrets (`.env`, tokens, credentials).
- Use `gh` for GitHub operations (PRs, checks, comments).
- Preserve layered architecture and controllers/hooks patterns.

Before finishing:

- Run **targeted** validation for affected workspaces.
- If the change is broad, run full-repo validation.
- Update docs if flows, commands, or conventions changed.

---

## 3) Skill routing (which skill to load per task)

### Essential by stack

| Task                                 | Skill        |
| ------------------------------------ | ------------ |
| TypeScript typing and type design    | `typescript` |
| React 19 components and patterns     | `react-19`   |
| Tailwind v4 styling                  | `tailwind-4` |
| Schema validation (API/env) with Zod | `zod-4`      |
| Global state with Zustand            | `zustand-5`  |

### Very useful in this repo

| Task                             | Skill                         |
| -------------------------------- | ----------------------------- |
| React rendering/performance work | `vercel-react-best-practices` |
| High-quality UI construction     | `frontend-design`             |
| UX/visual accessibility audits   | `web-design-guidelines`       |
| E2E when adding a test suite     | `playwright`                  |

### SDD flow (for medium/large changes)

| Phase                  | Skill         |
| ---------------------- | ------------- |
| Initialize SDD context | `sdd-init`    |
| Explore solution       | `sdd-explore` |
| Proposal               | `sdd-propose` |
| Specification          | `sdd-spec`    |
| Technical design       | `sdd-design`  |
| Task breakdown         | `sdd-tasks`   |
| Implementation         | `sdd-apply`   |
| Verification           | `sdd-verify`  |
| Archive                | `sdd-archive` |

---

## 4) Workspace architecture and boundaries

### Backend (`apps/backend`)

- Stack: Express + Prisma + BullMQ + Redis + Zod.
- Pattern: simplified Clean Architecture / DDD.
- Layers:
  - `domain/` (core, no external dependencies)
  - `application/` (use cases/services)
  - `infrastructure/` (DB, external APIs, queues, FS)
  - `presentation/` (routes/controllers/middleware/SSE)

Rule: dependencies point inward (`presentation -> application -> domain`; `infrastructure` implements contracts).

### Frontend (`apps/frontend`)

- Stack: React 19 + Vite + React Router + TanStack Query + Zustand + Tailwind 4.
- Organization: components (atoms/molecules/organisms/layouts), `views/`, `hooks/`, `services/`, `store/`.
- Patterns:
  - Keep view logic in `hooks/controllers`.
  - Keep server state in `hooks/queries` / `hooks/mutations`.
  - Real-time sync via SSE (`useServerEvents`).

### Shared (`packages/shared`)

- Common contracts (DTO types, enums, utilities).
- Changes here can affect both backend and frontend.

---

## 5) Working commands

### Root

- Full-stack dev: `pnpm dev`
- Monorepo build: `pnpm build`
- Monorepo lint: `pnpm lint`
- Monorepo format: `pnpm format`
- Clean: `pnpm clean`

### Backend

- Dev: `pnpm --filter backend run dev`
- Build: `pnpm --filter backend run build`
- Lint: `pnpm --filter backend run lint`
- Prisma migrate deploy: `pnpm --filter backend run prisma:migrate:deploy`

### Frontend

- Dev: `pnpm --filter frontend run dev`
- Build: `pnpm --filter frontend run build`
- Lint: `pnpm --filter frontend run lint`
- Preview: `pnpm --filter frontend run preview`

### Shared

- Build: `pnpm --filter @spotiarr/shared run build`
- Lint: `pnpm --filter @spotiarr/shared run lint`

---

## 6) Recommended validation order

1. **Local frontend changes**
   - `pnpm --filter frontend run lint`
   - `pnpm --filter frontend run build`

2. **Local backend changes**
   - `pnpm --filter backend run lint`
   - `pnpm --filter backend run build`

3. **Shared or broad changes**
   - `pnpm lint`
   - `pnpm build`

Note: current CI validates `lint + build`. There is no repo-level automated test suite configured yet.

---

## 7) Code conventions

- Strict TypeScript (`strict: true` in base config).
- Import order with Prettier sort-imports:
  - third-party -> aliases (`@/...`) -> relative
- Frontend:
  - Prefer functional components and hooks.
  - Use `cn()` (`clsx` + `tailwind-merge`) for conditional classes.
  - Keep complex logic out of view components (controllers/hooks).
- Backend:
  - Validate inputs with Zod.
  - Centralize errors in middleware.
  - Use DI (`container.ts`) for service instantiation.
- Use explicit naming and stay consistent with existing structure.

---

## 8) Git and PR policy

- Hooks:
  - pre-commit runs `lint-staged`.
- Commits:
  - follow conventional style (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- PRs:
  - short description of what changed and why.
  - include verification steps executed.
  - include screenshots/GIFs for relevant UI changes.
- Never bypass hooks unless the user explicitly requests it.
- Never force-push to `main`.

---

## 9) Security and secrets

- Never commit:
  - `.env`, credentials, tokens, cookies.
- Use `.env.example` as reference.
- For configuration changes:
  - document new variables in README/CONTRIBUTING.
- Do not expose sensitive data in logs.

---

## 10) Documentation maintenance

If architecture, commands, or workflows change:

- Update `AGENTS.md`.
- Update `README.md` and/or `CONTRIBUTING.md`.
- Keep documented Node/pnpm versions aligned with the actual runtime.

---

## 11) Multi-agent compatibility (optional, recommended)

If interoperability with multiple assistants is needed:

- use `AGENTS.md` as the source of truth.
- optionally create symlinks (`CLAUDE.md`, `GEMINI.md`, `CODEX.md`) pointing to `AGENTS.md`.
