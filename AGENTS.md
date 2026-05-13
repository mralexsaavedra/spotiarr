# AGENTS.md

Instructions for AI coding assistants working in `spotiarr`.

> **Single source of truth.** `CLAUDE.md` and `GEMINI.md` are symlinks to this file.
> Skills live in `.agents/skills/` — load the relevant skill BEFORE writing any code.

---

## Project Overview

Spotiarr is a self-hosted Spotify companion for tracking and downloading music releases.

| Component | Location          | Tech Stack                                            |
| --------- | ----------------- | ----------------------------------------------------- |
| Backend   | `apps/backend`    | Node 22, Express, Prisma (SQLite), BullMQ, Redis, Zod |
| Frontend  | `apps/frontend`   | React 19, Vite, TanStack Query, Zustand, Tailwind 4   |
| Shared    | `packages/shared` | DTOs, enums, shared utilities                         |

External services: **Redis**, **FFmpeg**, **yt-dlp**, Python 3.11/3.12.

---

## Quick Start

```bash
nvm use
corepack enable
pnpm install
```

---

## Agent Checklist

**Before starting:**

- Confirm scope: backend, frontend, shared, or cross-workspace.
- Keep changes minimal and focused on the objective.
- Do not edit unrelated files.
- Never commit secrets (`.env`, tokens, credentials).
- Use `gh` for GitHub operations (PRs, checks, comments).
- Preserve layered architecture and controllers/hooks patterns.

**Before finishing:**

- Run targeted validation for affected workspaces (see commands below).
- If the change is broad, run full-repo validation.
- Update docs if flows, commands, or conventions changed.

---

## Available Skills

Load the relevant skill by reading the SKILL.md at the listed path. Multiple skills can apply simultaneously.

### Spotiarr-Specific Skills

| Skill                   | Trigger                                                  | Path                                                      |
| ----------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| `spotiarr-architecture` | Architectural decisions, layer placement, repo structure | [SKILL.md](.agents/skills/spotiarr-architecture/SKILL.md) |
| `spotiarr-workflow`     | Commands, validation, PR workflow, branches, secrets     | [SKILL.md](.agents/skills/spotiarr-workflow/SKILL.md)     |
| `spotiarr-prisma`       | Prisma queries, migrations, schemas (SQLite backend)     | [SKILL.md](.agents/skills/spotiarr-prisma/SKILL.md)       |
| `spotiarr-bullmq`       | BullMQ queues, workers, cron jobs                        | [SKILL.md](.agents/skills/spotiarr-bullmq/SKILL.md)       |
| `spotiarr-i18n`         | i18n translations, i18next keys, adding a new language   | [SKILL.md](.agents/skills/spotiarr-i18n/SKILL.md)         |
| `spotiarr-release`      | Version bump, CHANGELOG, git tag, GitHub Release         | [SKILL.md](.agents/skills/spotiarr-release/SKILL.md)      |

### Generic Skills

| Skill                         | Trigger                                                     | Path                                                            |
| ----------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| `typescript-advanced-types`   | TypeScript types, interfaces, generics, utility types       | [SKILL.md](.agents/skills/typescript-advanced-types/SKILL.md)   |
| `react-best-practices`        | React 19 components, hooks, patterns, performance           | [SKILL.md](.agents/skills/react-best-practices/SKILL.md)        |
| `vercel-react-best-practices` | React rendering optimization, bundle size, waterfalls       | [SKILL.md](.agents/skills/vercel-react-best-practices/SKILL.md) |
| `composition-patterns`        | Compound components, context, boolean prop refactoring      | [SKILL.md](.agents/skills/composition-patterns/SKILL.md)        |
| `tailwind-css-patterns`       | Tailwind v4 styling, responsive layouts, dark mode          | [SKILL.md](.agents/skills/tailwind-css-patterns/SKILL.md)       |
| `zod`                         | Schema validation with Zod (API boundaries, env vars)       | [SKILL.md](.agents/skills/zod/SKILL.md)                         |
| `frontend-design`             | High-quality UI construction, distinctive aesthetics        | [SKILL.md](.agents/skills/frontend-design/SKILL.md)             |
| `web-design-guidelines`       | UX/visual accessibility audits, design review               | [SKILL.md](.agents/skills/web-design-guidelines/SKILL.md)       |
| `accessibility`               | WCAG 2.2 audits, a11y improvements, keyboard nav            | [SKILL.md](.agents/skills/accessibility/SKILL.md)               |
| `vite`                        | Vite config, plugins, SSR, Rolldown migration               | [SKILL.md](.agents/skills/vite/SKILL.md)                        |
| `nodejs-backend-patterns`     | Node.js backend services, Express/Fastify, REST APIs        | [SKILL.md](.agents/skills/nodejs-backend-patterns/SKILL.md)     |
| `nodejs-best-practices`       | Node.js architecture, framework selection, async patterns   | [SKILL.md](.agents/skills/nodejs-best-practices/SKILL.md)       |
| `nodejs-express-server`       | Express middleware, authentication, routing                 | [SKILL.md](.agents/skills/nodejs-express-server/SKILL.md)       |
| `prisma-cli`                  | Prisma CLI commands, migrate, generate, studio              | [SKILL.md](.agents/skills/prisma-cli/SKILL.md)                  |
| `prisma-client-api`           | Prisma Client CRUD, filters, relations, transactions        | [SKILL.md](.agents/skills/prisma-client-api/SKILL.md)           |
| `prisma-database-setup`       | Prisma provider configuration, driver adapters              | [SKILL.md](.agents/skills/prisma-database-setup/SKILL.md)       |
| `prisma-postgres`             | Prisma Postgres managed database, create-db, Management API | [SKILL.md](.agents/skills/prisma-postgres/SKILL.md)             |
| `seo`                         | Meta tags, structured data, sitemap, crawlability           | [SKILL.md](.agents/skills/seo/SKILL.md)                         |
| `bash-defensive-patterns`     | Defensive Bash scripts, CI/CD pipelines, error handling     | [SKILL.md](.agents/skills/bash-defensive-patterns/SKILL.md)     |

---

## Auto-Invoke Skills

When performing these actions, load the corresponding skill FIRST:

| Action                                                   | Skill                         |
| -------------------------------------------------------- | ----------------------------- |
| Deciding where new code belongs across layers            | `spotiarr-architecture`       |
| Running commands, validating changes, opening a PR       | `spotiarr-workflow`           |
| Writing Prisma queries, migrations, or schema changes    | `spotiarr-prisma`             |
| Writing BullMQ workers, queue definitions, or cron jobs  | `spotiarr-bullmq`             |
| Adding or modifying translation keys                     | `spotiarr-i18n`               |
| Publishing a new version of Spotiarr                     | `spotiarr-release`            |
| Writing TypeScript types, interfaces, or generics        | `typescript-advanced-types`   |
| Writing React components or hooks                        | `react-best-practices`        |
| Optimizing React rendering or reducing bundle size       | `vercel-react-best-practices` |
| Refactoring components with boolean prop proliferation   | `composition-patterns`        |
| Styling with Tailwind CSS                                | `tailwind-css-patterns`       |
| Writing or reviewing Zod schemas                         | `zod`                         |
| Building a UI component or page                          | `frontend-design`             |
| Reviewing UI for design quality or guidelines compliance | `web-design-guidelines`       |
| Auditing or improving accessibility                      | `accessibility`               |
| Working with Vite config or plugins                      | `vite`                        |
| Building backend services or REST APIs                   | `nodejs-backend-patterns`     |
| Working with Express middleware or authentication        | `nodejs-express-server`       |
| Running Prisma CLI commands                              | `prisma-cli`                  |
| Improving SEO or adding structured data                  | `seo`                         |
| Writing shell scripts or CI pipeline scripts             | `bash-defensive-patterns`     |

---

## Validation Commands

| Scope                   | Commands                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------- |
| Frontend only           | `pnpm --filter frontend run lint` → `pnpm --filter frontend run build`                 |
| Backend only            | `pnpm --filter backend run lint` → `pnpm --filter backend run build`                   |
| Shared package          | `pnpm --filter @spotiarr/shared run lint` → `pnpm --filter @spotiarr/shared run build` |
| Broad / cross-workspace | `pnpm lint` → `pnpm build`                                                             |

For medium/large changes use the SDD flow. Full skill listing: `.agents/skills/`.
