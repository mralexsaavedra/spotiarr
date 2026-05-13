# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

---

## User Skills

| Trigger                                                                                  | Skill                       | Path                                                  |
| ---------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------- |
| a11y audit, WCAG compliance, screen reader, keyboard navigation, make accessible         | accessibility               | `.agents/skills/accessibility/SKILL.md`               |
| robust shell scripts, CI/CD pipelines, system utilities, fault tolerance                 | bash-defensive-patterns     | `.agents/skills/bash-defensive-patterns/SKILL.md`     |
| compound components, render props, boolean prop proliferation, component architecture    | vercel-composition-patterns | `.agents/skills/composition-patterns/SKILL.md`        |
| build web components, pages, landing pages, dashboards, React components, UI design      | frontend-design             | `.agents/skills/frontend-design/SKILL.md`             |
| Node.js backend services, Express/Fastify, REST APIs, microservices, middleware          | nodejs-backend-patterns     | `.agents/skills/nodejs-backend-patterns/SKILL.md`     |
| Node.js architecture decisions, framework selection, async patterns, security            | nodejs-best-practices       | `.agents/skills/nodejs-best-practices/SKILL.md`       |
| Express.js servers, REST APIs, middleware chains, authentication, server logic           | nodejs-express-server       | `.agents/skills/nodejs-express-server/SKILL.md`       |
| prisma init, prisma generate, prisma migrate, prisma db, prisma studio, prisma mcp       | prisma-cli                  | `.agents/skills/prisma-cli/SKILL.md`                  |
| prisma query, findMany, create, update, delete, $transaction                             | prisma-client-api           | `.agents/skills/prisma-client-api/SKILL.md`           |
| configure postgres, connect to mysql, setup mongodb, sqlite setup                        | prisma-database-setup       | `.agents/skills/prisma-database-setup/SKILL.md`       |
| Prisma Postgres databases, create-db, create-pg, prisma postgres link                    | prisma-postgres             | `.agents/skills/prisma-postgres/SKILL.md`             |
| React components, Next.js pages, data fetching, bundle optimization, performance         | vercel-react-best-practices | `.agents/skills/react-best-practices/SKILL.md`        |
| improve SEO, optimize for search, fix meta tags, add structured data, sitemap            | seo                         | `.agents/skills/seo/SKILL.md`                         |
| architectural decisions, code across layers, adding features, repo structure in spotiarr | spotiarr-architecture       | `.agents/skills/spotiarr-architecture/SKILL.md`       |
| queue definitions, BullMQ workers, job handlers, cron jobs in backend                    | spotiarr-bullmq             | `.agents/skills/spotiarr-bullmq/SKILL.md`             |
| coding-assistant bridge files, compatibility symlinks, multi-agent configuration         | spotiarr-compatibility      | `.agents/skills/spotiarr-compatibility/SKILL.md`      |
| translation strings, i18n keys, new language, react-i18next                              | spotiarr-i18n               | `.agents/skills/spotiarr-i18n/SKILL.md`               |
| database queries, migrations, Prisma schemas in spotiarr                                 | spotiarr-prisma             | `.agents/skills/spotiarr-prisma/SKILL.md`             |
| bump version, nueva release, publish release, create release                             | spotiarr-release            | `.agents/skills/spotiarr-release/SKILL.md`            |
| running commands, validating changes, creating PRs, managing branches, secrets           | spotiarr-workflow           | `.agents/skills/spotiarr-workflow/SKILL.md`           |
| Tailwind CSS, responsive layouts, design systems, dark mode, utility classes             | tailwind-css-patterns       | `.agents/skills/tailwind-css-patterns/SKILL.md`       |
| TypeScript generics, conditional types, mapped types, template literals, utility types   | typescript-advanced-types   | `.agents/skills/typescript-advanced-types/SKILL.md`   |
| React components, Next.js pages, bundle optimization, performance (vercel)               | vercel-react-best-practices | `.agents/skills/vercel-react-best-practices/SKILL.md` |
| vite.config.ts, Vite plugins, building libraries, SSR apps with Vite                     | vite                        | `.agents/skills/vite/SKILL.md`                        |
| review UI, check accessibility, audit design, review UX, check against best practices    | web-design-guidelines       | `.agents/skills/web-design-guidelines/SKILL.md`       |
| z.object schemas, z.string validations, safeParse, z.infer, Zod validation               | zod                         | `.agents/skills/zod/SKILL.md`                         |

---

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### accessibility

- Target WCAG 2.2 AA minimum: 4.5:1 normal text, 3:1 large text color contrast
- All images need `alt`; decorative images use `alt=""` with `role="presentation"`
- Icon buttons require `aria-label` or visually-hidden text span
- Never remove focus outlines; use `:focus-visible` with visible outline instead
- All functionality must handle keyboard: both `click` and `keydown` (Enter/Space)
- Never convey information by color alone — pair with icon + text
- Videos need `<track kind="captions">`; audio needs a transcript
- Form errors: `aria-invalid="true"` + `aria-describedby` pointing to error element

### bash-defensive-patterns

- Start every script with `set -Eeuo pipefail`
- Always quote variables: `"$var"` not `$var`; use `[[ ]]` not `[ ]` for tests
- Trap cleanup: `trap 'rm -rf "$TMPDIR"' EXIT`; `trap 'echo "Error line $LINENO"' ERR`
- Temp dirs: `TMPDIR=$(mktemp -d)` then clean via EXIT trap
- Required vars: `: "${VAR:?VAR is not set}"`
- Array population: `mapfile -t arr < <(cmd)` not `arr=($(cmd))`
- Script dir detection: `SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"`
- Log errors to stderr (`>&2`); return 1 from functions on failure

### vercel-composition-patterns

- Avoid boolean props for behavior customization; use compound components instead
- Provider is the sole owner of state implementation (decouple interface from impl)
- Context interface shape: `{ state, actions, meta }` for dependency injection
- Use `children` for composition, not `renderX` render props
- Lift state into provider component so siblings can share it
- React 19+: no `forwardRef`; access refs as regular props; use `use()` over `useContext()`
- Prefer explicit variant components over boolean mode flags

### frontend-design

- Commit to a bold, intentional aesthetic direction before writing any code
- Never use generic fonts (Inter, Roboto, Arial, system fonts) — choose distinctive display fonts
- Never use clichéd color schemes (purple gradients on white) — vary themes across designs
- CSS variables for all colors; dominant color + sharp accent beats even distribution
- Animations: CSS-only for HTML; Motion library for React; staggered reveals over scattered interactions
- Spatial composition: asymmetry, overlap, diagonal flow, grid-breaking elements
- Maximalist → elaborate animations/effects; minimalist → restraint, precision, spacing
- Each design needs one unforgettable, context-specific differentiator

### nodejs-backend-patterns

- Layered architecture: controllers → services → repositories (inward deps only)
- Controllers: HTTP handling only — validate input, call service, return response
- Services: framework-agnostic business logic; no HTTP-specific types
- Repositories: data access only; never called directly from controllers
- All async controller methods: `try/catch` + call `next(error)` on failure
- Always apply `helmet()`, `cors()`, `compression()` as early middleware
- Validate input with Zod schemas at the route/controller boundary
- Custom error classes for typed, predictable error handling across layers

### nodejs-best-practices

- Ask about deployment target before choosing framework (Edge → Hono, perf → Fastify)
- New projects: ESM (`import/export`), not CommonJS
- Sequential async → `async/await`; parallel independent → `Promise.all`
- Never `console.log` in production; use structured logger (pino, winston)
- Custom error classes per domain; catch and format at middleware level
- Validate env vars at startup (Zod) — fail fast, don't discover missing vars in prod
- Rate limit all public endpoints; authenticate before any business logic runs

### nodejs-express-server

- Middleware order matters: body parsing → auth → routes → error handler
- Error middleware must have exactly 4 args: `(err, req, res, next)`
- All async route handlers must `try/catch` and call `next(error)` on failure
- Never expose stack traces or internals in production error responses
- Apply `express-rate-limit` on public routes; enforce HTTPS in production
- Keep route handlers thin; delegate logic to service layer
- Validate user input before processing; never rely on client-side validation alone

### prisma-cli

- Dev migrations: `prisma migrate dev --name <name>` (creates + applies)
- Production: `prisma migrate deploy` — never run `migrate dev` in production
- Always run `prisma generate` after any schema change
- Bun runtime: `bunx --bun prisma ...` (not bare `bunx prisma`)
- Prisma 7 SQL: use `prisma.config.ts` for datasource config
- `prisma db push` for prototyping only — generates no migration files
- `prisma migrate reset` wipes the database — never run in production

### prisma-client-api

- Instantiate once with driver adapter: `new PrismaClient({ adapter })`
- Use `findUniqueOrThrow()` / `findFirstOrThrow()` to skip null checks
- Prefer `select` over `include` to limit fetched fields; never over-fetch
- Array transactions: `prisma.$transaction([op1, op2])` for atomic operations
- Raw SQL: `$queryRaw` with tagged templates only — never string concatenation
- `createMany()` for bulk inserts; faster than looped `create()` calls
- Filter operators: `contains`, `startsWith`, `in`, `not`, `lt/lte/gt/gte`, `mode`

### prisma-database-setup

- Node.js 20.19+ and TypeScript 5.4+ required
- Bun: always `bunx --bun prisma ...` to use Bun runtime not Node.js
- SQL providers use driver adapter; MongoDB must stay on Prisma 6.x
- Generator block must specify explicit output: `output = "../generated"`
- Re-run `prisma generate` after every schema change
- PostgreSQL adapter: `@prisma/adapter-pg` with `pg` driver
- MongoDB: do NOT use `prisma.config.ts` or SQL adapter pattern

### prisma-postgres

- Quick start: `npx create-db@latest` (aliases: `create-pg`, `create-postgres`)
- Temporary databases auto-delete after ~24h unless claimed
- Link existing project: `prisma postgres link`; CI: add `--api-key` + `--database` flags
- Management API base URL: `https://api.prisma.io/v1`
- Auth options: service token (server-to-server) or OAuth 2.0
- SDK: `@prisma/management-api-sdk` for type-safe programmatic provisioning
- Serverless/edge: `@prisma/adapter-ppg` with `@prisma/ppg` driver

### vercel-react-best-practices

- `Promise.all()` for independent async operations to eliminate request waterfalls
- Import directly from source; never from barrel/index files (bundle bloat)
- `next/dynamic` for heavy components; load analytics/logging after hydration
- `React.cache()` for per-request dedup in RSC; LRU cache for cross-request
- Never define mutable module-level state in RSC/SSR contexts
- Functional `setState(prev => ...)` for stable callbacks; avoid inline object props
- Never define components inside other components (causes remount on every render)
- `useTransition` / `startTransition` for non-urgent state updates

### seo

- Title tags: 50-60 chars, primary keyword near start, unique per page, brand at end
- Meta descriptions: 150-160 chars, unique per page, include primary keyword + CTA
- Single `<h1>` per page; logical heading hierarchy — never skip levels
- Add `<link rel="canonical">` on every page to prevent duplicate content issues
- URLs: lowercase, hyphens (not underscores), < 75 chars, HTTPS always
- `robots.txt` must NOT block CSS/JS resources needed for rendering
- Structured data (JSON-LD preferred) for rich results; validate with schema.org
- Sitemap: max 50k URLs / 50MB; include only canonical, indexable URLs

### spotiarr-architecture

- Monorepo: pnpm workspaces — `apps/backend`, `apps/frontend`, `packages/shared`
- Backend layers (inward deps only): `presentation → application → domain`
- `infrastructure/` implements contracts for inner layers; domain never calls infra directly
- Frontend: business/view logic in `hooks/`, not in rendering components
- Server state: `hooks/queries` + `hooks/mutations`; real-time via `useServerEvents`
- TypeScript `strict: true` everywhere; import order: third-party → `@/` aliases → relative
- Backend: Zod validation at boundaries; DI via `container.ts`; centralized error middleware
- Shared DTOs, enums, utilities only in `packages/shared/` — not duplicated per app

### spotiarr-bullmq

- Queues: singleton getter in `infrastructure/setup/queues.ts`
- Workers: `infrastructure/workers/` (one file per worker); jobs: `infrastructure/jobs/`
- Job IDs: `${type}-${entityId}-${Date.now()}` for traceability
- Download jobs: `attempts: 3`, exponential backoff `5000ms`; search: `attempts: 1`, no retry
- Worker events: `completed` → log; `drained` → downstream actions + SSE; `failed` → update status
- Cron: `node-cron` in `infrastructure/jobs/`; prevent overlapping runs at impl level
- No DLQ — jobs lost after max attempts; job ID collisions possible on rapid re-enqueue
- Redis: singleton/shared connection via `getEnv()` for host/port

### spotiarr-compatibility

- `AGENTS.md` is the single canonical source for all agent instructions
- Symlinks `CLAUDE.md`, `GEMINI.md`, `OPENCODE.md` must all point to `AGENTS.md`
- Registry files: `.atl/skill-registry.md` + `skills-lock.json`
- Any architecture/workflow change → update `AGENTS.md` first, then sync all compatibility files

### spotiarr-i18n

- Config: `apps/frontend/src/i18n.ts`; locales: `apps/frontend/src/locales/{lang}.json`
- Languages: `en` (primary + fallback), `es`; single `translation` namespace
- Key format: dot-notation camelCase — `common.loading`, `common.errors.pageNotFound`
- Usage: `const { t } = useTranslation()` → `t("key")` or `t("key", { var: val })`
- Add every new key to ALL language files — missing keys cause runtime fallback drift
- Type declarations in `apps/frontend/src/types/i18next.d.ts` based on `en.json`
- `escapeValue: false` is configured — HTML in translation strings is NOT escaped

### spotiarr-prisma

- Schema: `apps/backend/prisma/schema.prisma` — SQLite datasource
- Prisma Client calls ONLY in `apps/backend/src/infrastructure/database/`
- Never import Prisma in `domain/` or `presentation/` layers
- Data flow: HTTP request → Zod parse → typed DTO → repository → Prisma Client
- Migrations: `pnpm --filter backend run prisma:migrate:deploy`
- Regenerate: `pnpm --filter backend run prisma:generate` after every schema change
- Map Prisma errors to app-safe errors; never leak raw DB error messages to HTTP responses
- Multi-step writes: pass transaction client through repository methods

### spotiarr-release

- Version lives ONLY in root `package.json`; workspace packages stay at `0.0.0`
- Bump commit: `chore(release): bump to vX.Y.Z` (conventional commits enforced)
- ALWAYS `git tag -a vX.Y.Z -m "vX.Y.Z"` — bare `git tag` opens nvim interactively
- Push: `git push origin main --tags`
- GHA creates release with generic body — ALWAYS replace: `gh release edit vX.Y.Z --notes "$(...)"`
- Do NOT pass `--title` to `gh release edit` — descriptive title lives as H1 inside the body
- CHANGELOG: human-readable descriptions, grouped by type; omit `chore:` and `docs:` commits
- Bump type: `fix:` only → patch; `feat:` present → minor; `BREAKING CHANGE` → major

### spotiarr-workflow

- Frontend-only: `pnpm --filter frontend run lint` then `pnpm --filter frontend run build`
- Backend-only: `pnpm --filter backend run lint` then `pnpm --filter backend run build`
- Broad/shared changes: `pnpm lint` then `pnpm build`
- Branch naming: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/` prefix
- PR body: what changed, why, verification steps; screenshots/GIFs for UI changes
- Never commit `.env`, tokens, or credentials; `.env.example` is the source of truth
- No automated test suite yet — CI validates lint + build only
- PR creation: `gh pr create` with conventional commit title

### tailwind-css-patterns

- Mobile-first: base styles first, then `sm:`, `md:`, `lg:` for larger screens
- Tailwind v4.1+: CSS-first config via `@theme` directive (not `tailwind.config.js`)
- Use Tailwind spacing scale (4, 8, 12, 16...); stay within color system for consistency
- Prefer utility classes over `@apply` for maintainability
- `cn()` utility for conditional class composition in React
- Dark mode: `dark:` prefix on every affected class; configure `darkMode` correctly
- Include all template paths in content config or classes are purged in production
- Focus styles required: `:focus-visible` with visible outline for keyboard nav

### typescript-advanced-types

- Enable `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- Use `z.infer<typeof schema>` over manual type declarations to avoid drift
- Generics: constrain with `extends` — e.g. `<T extends HasLength>` prevents unsafe ops
- Conditional types: `T extends U ? X : Y`; use `infer` to extract sub-types
- Mapped types: `{ [K in keyof T]: ... }` for property-by-property transformation
- Template literal types: `` `${A}${B}` `` for string-pattern types
- Use `satisfies` operator to keep literal types while enforcing conformance
- Utility types: `Partial`, `Required`, `Pick`, `Omit`, `ReturnType`, `Awaited`

### vite

- Always use `vite.config.ts` (TypeScript), not `.js`
- ESM only — avoid CommonJS in Vite projects
- Wrap config in `defineConfig()` for type safety
- Aliases: `resolve: { alias: { '@': '/src' } }`
- API proxy in dev: `server: { proxy: { '/api': 'http://localhost:8080' } }`
- Vite 8: Rolldown bundler + Oxc transformer — check `references/rolldown-migration.md` for breaking changes
- CLI: `vite` (dev), `vite build` (prod), `vite preview` (preview build)

### web-design-guidelines

- Fetch fresh guidelines from Vercel before each review via WebFetch
- Read specified files then check against ALL rules from the fetched guidelines
- Report findings in terse `file:line: [rule] description` format
- If no files specified, ask user which files to review before proceeding

### zod

- Use `z.unknown()` not `z.any()` for unknown external data
- `safeParse()` for user/external input; `parse()` only for trusted internal data
- Use `z.infer<typeof schema>` for types — never duplicate type definitions manually
- Validate at system boundaries only (HTTP, external APIs, env vars)
- `z.object().strict()` rejects unknown keys; `.strip()` silently drops them
- `z.discriminatedUnion()` for tagged unions (not `z.union()`)
- Cache schema instances at module level — never create schemas inside hot functions
- `error.flatten()` for form-friendly field-keyed error maps
- `z.coerce` for form data/query params arriving as strings
- `extend()` for adding fields; `pick()`/`omit()` for schema variants

---

## Project Conventions

| File              | Path                     | Notes                                                 |
| ----------------- | ------------------------ | ----------------------------------------------------- |
| AGENTS.md (index) | `AGENTS.md`              | Canonical agent instructions — single source of truth |
| CLAUDE.md         | `CLAUDE.md`              | Symlink → `AGENTS.md` (Claude Code)                   |
| GEMINI.md         | `GEMINI.md`              | Symlink → `AGENTS.md` (Gemini CLI)                    |
| OPENCODE.md       | `OPENCODE.md`            | Symlink → `AGENTS.md` (OpenCode)                      |
| Skill registry    | `.atl/skill-registry.md` | This file — skill-name to path mapping                |
| Skills lock       | `skills-lock.json`       | Skill metadata tracking                               |

All agent instruction files point to `AGENTS.md` as the single source of truth. Update `AGENTS.md` first when architecture, commands, or conventions change.
