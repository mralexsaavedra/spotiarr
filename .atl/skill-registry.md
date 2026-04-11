# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger                                                                                             | Skill                        | Path                                                  |
| --------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| When making architectural decisions, writing code across layers, or understanding repo structure    | spotiarr-architecture        | ./.agents/skills/spotiarr-architecture/SKILL.md       |
| When running commands, validating changes, creating PRs, managing branches, or handling secrets     | spotiarr-workflow            | ./.agents/skills/spotiarr-workflow/SKILL.md           |
| When writing database queries, migrations, or Prisma schemas                                        | spotiarr-prisma              | ./.agents/skills/spotiarr-prisma/SKILL.md             |
| When writing queue definitions, workers, job handlers, or cron jobs                                 | spotiarr-bullmq              | ./.agents/skills/spotiarr-bullmq/SKILL.md             |
| When adding or modifying translations, working with i18n keys, or adding a new language             | spotiarr-i18n                | ./.agents/skills/spotiarr-i18n/SKILL.md               |
| When user says "sube de version", "nueva release", "publish release", or asks to publish a version  | spotiarr-release             | ./.agents/skills/spotiarr-release/SKILL.md            |
| When setting up coding assistant compatibility, adding bridge files, or managing multi-agent config | spotiarr-compatibility       | ./.agents/skills/spotiarr-compatibility/SKILL.md      |
| When building polished, production-grade frontend UI                                                | frontend-design              | ./.agents/skills/frontend-design/SKILL.md             |
| When reviewing React/Next.js code for performance — bundle optimization, data fetching, re-renders  | vercel-react-best-practices  | ./.agents/skills/vercel-react-best-practices/SKILL.md |
| When auditing UI for Web Interface Guidelines and accessibility/UX quality                          | web-design-guidelines        | ./.agents/skills/web-design-guidelines/SKILL.md       |
| When writing TypeScript code — types, interfaces, generics                                          | typescript                   | ~/.config/opencode/skills/typescript/SKILL.md         |
| When writing React components — no useMemo/useCallback needed                                       | react-19                     | ~/.config/opencode/skills/react-19/SKILL.md           |
| When styling with Tailwind — cn(), theme variables, no var() in className                           | tailwind-4                   | ~/.config/opencode/skills/tailwind-4/SKILL.md         |
| When using Zod for validation — breaking changes from v3                                            | zod-4                        | ~/.config/opencode/skills/zod-4/SKILL.md              |
| When managing React state with Zustand                                                              | zustand-5                    | ~/.config/opencode/skills/zustand-5/SKILL.md          |
| When writing E2E tests — Page Objects, selectors, MCP workflow                                      | playwright                   | ~/.config/opencode/skills/playwright/SKILL.md         |
| When working with Next.js — routing, Server Actions, data fetching                                  | nextjs-15                    | ~/.config/opencode/skills/nextjs-15/SKILL.md          |
| When building AI chat features — breaking changes from v4                                           | ai-sdk-5                     | ~/.config/opencode/skills/ai-sdk-5/SKILL.md           |
| When creating a pull request, opening a PR, or preparing changes for review                         | branch-pr                    | ~/.config/opencode/skills/branch-pr/SKILL.md          |
| When creating a GitHub issue, reporting a bug, or requesting a feature                              | issue-creation               | ~/.config/opencode/skills/issue-creation/SKILL.md     |
| When reviewing PRs/issues backlog with structured analysis                                          | pr-review                    | ~/.config/opencode/skills/pr-review/SKILL.md          |
| When creating new AI agent skills                                                                   | skill-creator                | ~/.config/opencode/skills/skill-creator/SKILL.md      |
| When user says "judgment day", "review adversarial", "dual review", "juzgar"                        | judgment-day                 | ~/.config/opencode/skills/judgment-day/SKILL.md       |
| When reviewing technical exercises/candidate submissions                                            | technical-review             | ~/.config/opencode/skills/technical-review/SKILL.md   |
| When building a presentation, slide deck, course material, or talk slides                           | stream-deck                  | ~/.config/opencode/skills/stream-deck/SKILL.md        |
| When writing Go tests, using teatest, or adding test coverage                                       | go-testing                   | ~/.config/opencode/skills/go-testing/SKILL.md         |
| When writing Python tests — fixtures, mocking, markers                                              | pytest                       | ~/.config/opencode/skills/pytest/SKILL.md             |
| When building REST APIs with Django — ViewSets, Serializers, Filters                                | django-drf                   | ~/.config/opencode/skills/django-drf/SKILL.md         |
| When writing C# code, .NET APIs, or Entity Framework models                                         | dotnet                       | ~/.config/opencode/skills/dotnet/SKILL.md             |
| When writing Angular components, services, templates, or making architectural decisions             | scope-rule-architect-angular | ~/.config/opencode/skills/angular/SKILL.md            |
| When user asks to release, bump version, update homebrew, or publish a new version                  | homebrew-release             | ~/.config/opencode/skills/homebrew-release/SKILL.md   |
| When user asks to create an epic, large feature, or multi-task initiative                           | jira-epic                    | ~/.config/opencode/skills/jira-epic/SKILL.md          |
| When user asks to create a Jira task, ticket, or issue                                              | jira-task                    | ~/.config/opencode/skills/jira-task/SKILL.md          |
| When user asks "how do I do X", "find a skill for X", or wants to discover/install skills           | find-skills                  | ~/.agents/skills/find-skills/SKILL.md                 |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### spotiarr-architecture

- pnpm monorepo: `apps/backend`, `apps/frontend`, `packages/shared`
- Backend Clean Architecture: domain/ (no external deps) → application/ (use cases) → infrastructure/ (adapters) → presentation/ (routes/controllers)
- Dependencies point inward; `infrastructure` implements contracts for inner layers
- Frontend: components/ (atoms→organisms), views/, hooks/ (queries/mutations), services/, store/
- Keep view logic in hooks/, not rendering components; use `cn()` for conditional classes
- Input validation with Zod; centralized error handling via middleware; DI via `container.ts`

### spotiarr-workflow

- Run smallest valid command: frontend-only → `pnpm --filter frontend run lint && build`; backend-only → `pnpm --filter backend run lint && build`; broad → `pnpm lint && build`
- Branch naming: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`
- PR must include: branch up to date with main, lint+build passing, body with what/why/verification, screenshots for UI changes
- Never commit `.env`, credentials, or tokens; use `.env.example` as source of truth
- PR creation: `gh pr create` with conventional title

### spotiarr-prisma

- Schema at `apps/backend/prisma/schema.prisma`; SQLite datasource
- Prisma calls ONLY in `apps/backend/src/infrastructure/database/` — never in domain/ or presentation/
- Validate input at boundaries with Zod, pass typed parsed inputs to repositories
- Migrations: `pnpm --filter backend run prisma:migrate:deploy`; generate: `pnpm --filter backend run prisma:generate`
- Map known Prisma errors (unique constraint, not found, FK) to application-safe errors; never leak raw DB internals

### spotiarr-bullmq

- Queue init: `infrastructure/setup/queues.ts`; workers: `infrastructure/workers/`; cron: `infrastructure/jobs/`
- Job IDs: `${type}-${entityId}-${Date.now()}`; downloads use exponential backoff (attempts: 3, delay 5000ms)
- Redis connection centralized via `getEnv()` singleton; reuse across queues
- Worker events: completed → log; drained → downstream actions; failed → update entity status + emit events
- No DLQ — jobs lost after max attempts; no locking on cron — prevent overlapping at implementation level

### spotiarr-i18n

- Config: `apps/frontend/src/i18n.ts`; translations: `apps/frontend/src/locales/{lang}.json`
- Fallback language: `en`; resources eagerly loaded; single namespace `translation`
- Key naming: nested dot-notation (`common.loading`, `common.errors.pageNotFound`) + camelCase (`downloadAll`, `clearAll`)
- Usage: `const { t } = useTranslation(); t("common.loading")` — interpolation: `t("key", { time: "14:30" })`
- Add new keys to ALL language files; `escapeValue: false` configured (HTML not escaped)

### spotiarr-release

- ONLY edit root `package.json` version — workspace packages are `0.0.0` private, NEVER touch them
- Commit as `chore(release): bump to vX.Y.Z`; tag as `vX.Y.Z` with `v` prefix
- Push to main with `--tags` in same command; NEVER create GitHub Release manually (GHA handles it)
- Suggest bump type from conventional commits: fix→patch, feat→minor, BREAKING CHANGE→major
- Verify: `gh run list --workflow=release.yml --limit=1`

### spotiarr-compatibility

- `AGENTS.md` is the canonical source; symlinks: CLAUDE.md, CODEX.md, GEMINI.md, OPENCODE.md all → AGENTS.md
- Dedicated bridge files: `.cursorrules` (Cursor), `.github/copilot-instructions.md` (Copilot)
- Registry: `.atl/skill-registry.md`, `skills-lock.json`
- If architecture/commands change: update AGENTS.md, refresh symlinks, update README/CONTRIBUTING

### frontend-design

- Commit to a BOLD aesthetic direction (brutalist, luxury, retro-futuristic, organic, etc.) — intentionality, not intensity
- Typography: distinctive, characterful fonts — NEVER Inter, Roboto, Arial, system fonts
- Color: cohesive palette with CSS variables; dominant colors with sharp accents
- Motion: CSS-only animations preferred; staggered reveals on page load; scroll-triggered effects
- NEVER use generic AI aesthetics: purple gradients on white, predictable layouts, cookie-cutter patterns

### vercel-react-best-practices

- CRITICAL: Eliminate waterfalls — use Promise.all() for independent ops, start promises early, await late
- CRITICAL: Avoid barrel file imports — import directly from source; costs 200-800ms per import
- Derive state during render, not in effects; don't store computed values in useState
- Don't define components inside components (causes remount on every render)
- Use functional setState (`set(prev => ...)`) for stable callbacks and to prevent stale closures
- Use `toSorted()` instead of `sort()` for immutability; use `useDeferredValue` for expensive derived renders
- Use `startTransition` for non-urgent updates; cache repeated function calls with module-level Map

### web-design-guidelines

- Fetch fresh guidelines from `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` before each review
- Read specified files, apply all rules, output findings in `file:line` format
- If no files specified, ask the user which files to review

### typescript

- ALWAYS: const object first, then extract type — `const STATUS = { ACTIVE: "active" } as const; type Status = (typeof STATUS)[keyof typeof STATUS]`
- ALWAYS: flat interfaces — nested objects become dedicated interface, reference not inline
- NEVER: use `any` — use `unknown` + type guards, or generics
- Use utility types: Pick, Omit, Partial, Required, Record, Extract, Exclude, ReturnType
- `import type { X }` for type-only imports

### react-19

- No useMemo/useCallback — React Compiler handles memoization automatically
- ALWAYS: named imports from "react" — never `import React from "react"`
- Server Components by default; add "use client" only for useState/useEffect/onClick/browser APIs
- `use()` hook for promises and conditional context reading
- ref is a regular prop — no forwardRef needed
- Actions: `useActionState` for form mutations with pending state

### tailwind-4

- NEVER: `var()` in className — use Tailwind semantic classes (`bg-primary`, `text-slate-400`)
- NEVER: hex colors in className — use Tailwind color classes
- `cn()` for conditional classes and merging conflicts; NOT needed for static classes
- Dynamic values → `style={{ width: \`${x}%\` }}`; charts/libraries → `var()` in constants only
- Arbitrary values OK for one-offs: `w-[327px]` — but NOT for colors

### zod-4

- BREAKING: `z.email()`, `z.uuid()`, `z.url()` are now top-level (not `z.string().email()`)
- BREAKING: error param is `error` not `message` — `z.email({ error: "Invalid" })`
- `z.coerce.number()` for type conversion; `z.preprocess()` for trimming/sanitization
- Use `safeParse()` for non-throwing validation; `.refine()` and `.superRefine()` for custom rules
- Integration with react-hook-form via `zodResolver(schema)`

### zustand-5

- Select specific fields: `useStore((state) => state.name)` — avoid selecting entire store
- Multiple fields: use `useShallow((state) => ({ name, email }))`
- Persist: `create<Store>()(persist((set) => ({...}), { name: "key" }))`
- Async actions: set loading/error states; use functional setState for stable callbacks
- Slices pattern: compose multiple slices with spread; immer middleware for direct mutations

### playwright

- MCP first: navigate → snapshot → interact → screenshot → verify flow → then write tests
- Selector priority: getByRole → getByLabel → getByText → getByTestId (last resort) — NEVER CSS selectors
- Page Object Model: all pages extend BasePage; reuse existing page objects before creating new
- File structure: `tests/{page}/{page}-page.ts` (POM) + `{page}.spec.ts` (all tests) + `{page}.md` (docs)
- Tags: `@critical`, `@e2e`, `@feature`, `@TEST-ID-001`; one test() per request unless "comprehensive"
- Common methods go to BasePage; test data generators go to helpers.ts

### nextjs-15

- Server Components by default — async, no directive; "use client" only for interactivity/hooks
- Server Actions: `"use server"`, use `revalidatePath()` + `redirect()` after mutations
- Parallel data fetch: `Promise.all()` in page; streaming with `<Suspense fallback>`
- Route Handlers: `export async function GET/POST(request: NextRequest)` returning `NextResponse.json()`
- Metadata: static `export const metadata` or dynamic `generateMetadata()`
- `import "server-only"` to prevent client import of server modules

### ai-sdk-5

- BREAKING: import from `@ai-sdk/react` (not `"ai"`); use `DefaultChatTransport` for transport config
- BREAKING: `message.content` → `message.parts` array; extract text: `.filter(p => p.type === "text").map(p => p.text).join("")`
- Client: `const { messages, sendMessage, isLoading } = useChat({ transport })`; send: `sendMessage({ text: input })`
- Server: `streamText({ model, messages })` → `result.toDataStreamResponse()`
- Tools: `tool({ description, parameters: z.object({...}), execute })` inside streamText config
- useCompletion: `useCompletion({ transport: new DefaultCompletionTransport({ api }) })`

### branch-pr

- Every PR MUST link an approved issue — `Closes #N` in body; no exceptions
- Every PR MUST have exactly one `type:*` label (type:bug, type:feature, type:docs, etc.)
- Branch naming: `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)/[a-z0-9._-]+$`
- Conventional commits: `type(scope): description` — enforced by regex
- PR body: linked issue, type checkbox, summary bullets, changes table, test plan, contributor checklist

### issue-creation

- Blank issues disabled — MUST use template (bug_report.yml or feature_request.yml)
- Every issue gets `status:needs-review` on creation; maintainer adds `status:approved` before PRs
- Bug Report fields: description, steps to reproduce, expected/actual behavior, OS, agent, shell
- Feature Request fields: problem description, proposed solution, affected area
- Questions go to Discussions, NOT issues

### pr-review

- Gather: `gh issue list`, `gh pr list`, `gh pr view`, `gh pr diff` — read current codebase before reviewing
- Red flags → DO NOT MERGE: debug files, unused vars, hardcoded secrets, syntax errors, breaking changes without migration
- Yellow flags → Request Changes: too many commits (squash), missing validation, conflicts with other PRs
- Green flags → MERGE: small focused changes, tests included, clean history, docs updated
- Output: structured verdict table with file:line references for each finding

### skill-creator

- Create when: repeated patterns, project-specific conventions, complex workflows, decision trees
- Structure: `skills/{name}/SKILL.md` + optional `assets/` (templates/schemas) + `references/` (docs links)
- SKILL.md template: frontmatter (name, description with Trigger, license, metadata) + When to Use + Critical Patterns + Commands
- Naming: generic → `{technology}`, project → `{project}-{component}`, workflow → `{action}-{target}`

### judgment-day

- Launch TWO blind sub-agents in parallel via `delegate(async)` — orchestrator coordinates only
- Resolve skills from registry BEFORE launching judges; inject compact rules as `## Project Standards (auto-resolved)`
- Verdict synthesis: Confirmed (both found) / Suspect (one found) / Contradiction (disagree)
- WARNING classification: real (causes bug in production) vs theoretical (contrived scenario) — theoretical → INFO, don't fix
- After 2 fix iterations with remaining confirmed CRITICALs → escalate to user; clean from both → APPROVED

### technical-review

- 6 evaluation factors: Styling, Technical expertise, Code Quality, Go beyond, Detailed explanations, Other comments
- Score each 0-10 with specific evidence from code; output as Markdown table per candidate
- Red flags: secrets in code, employer data exposed, no tests, copy-pasted code, missing README, SQL injection, giant functions (>50 lines)
- Ask: "Would I trust this person to work without constant supervision?" for technical expertise score

### stream-deck

- Single-page HTML presentation — no frameworks, no build step, open index.html directly
- Gentleman Kanagawa Blur palette: bg `#06080f`, surface `#1c212c`, fg `#f3f6f9`, accent `#e0c15a`
- CRITICAL contrast: minimum 4:1 against `#1c212c`; muted text `#8394A3` not `#5c6170`
- No vertical scroll — `100dvh` viewport; inline SVGs only (no image files)
- Module system with sidebar rail; vim-mode theming (Normal, Command, Insert, Visual, Terminal, Replace)

### go-testing

- Table-driven tests: `tests := []struct{ name, input, expected string; wantErr bool }{...}; for _, tt := range tests { t.Run(tt.name, ...) }`
- Bubbletea: test Model state transitions directly with `m.Update(tea.KeyMsg{...})`
- Teatest: `teatest.NewTestModel(t, m)` → `tm.Send(msg)` → check output with `tm.FinalModel()`
- Golden files: `testdata/` directory; `flag.Update` for updating golden files
- Test file naming: `*_test.go` same package; use `t.Helper()` in helper functions

### pytest

- Class-based tests: `class TestUserService: def test_create_user_success(self):`
- Fixtures: `@pytest.fixture` with `yield` for teardown; scopes: module, class, session
- conftest.py for shared fixtures; `pytest.raises(ExceptionType, match="regex")` for exception testing
- Mocking: `patch("module.path")` context manager; `MagicMock()` for complex objects
- Markers: `@pytest.mark.skip`, `@pytest.mark.parametrize("input,expected", [...])`

### django-drf

- ViewSet: `ModelViewSet` with `queryset`, `serializer_class`, `filterset_class`, `permission_classes`
- Separate serializers for read/create/update; `get_serializer_class()` returns based on `self.action`
- Custom actions: `@action(detail=True, methods=["post"])` for non-CRUD endpoints
- Filters: `django_filters.FilterSet` with `CharFilter(lookup_expr="icontains")`, `DateTimeFilter(lookup_expr="gte")`
- Nested serializers via `SerializerMethodField`; `read_only_fields` in Meta

### dotnet

- Minimal APIs for new endpoints: `app.MapGet("/", ...)` with `TypedResults.Ok/NotFound/Created`
- Primary constructors for DI: `public class OrderService(AppDbContext db, ILogger<OrderService> logger) : IOrderService`
- Clean Architecture: Domain (entities/interfaces) → Application (commands/queries/DTOs) → Infrastructure (EF Core/services) → WebApi (endpoints)
- EF Core: Fluent API configuration (`IEntityTypeConfiguration<T>`), NOT data annotations
- Use `AsNoTracking()` for read queries; `HasPrecision(18, 2)` for decimal properties

### scope-rule-architect-angular

- ALL components standalone by default (Angular 20+); use `input()`/`output()` functions, not decorators
- `ChangeDetectionStrategy.OnPush` for all; `inject()` instead of constructor injection; signals for state
- Native control flow: `@if`, `@for`, `@switch`; `@defer` for lazy loading; no `ngClass`/`ngStyle`
- Scope Rule: code used by 2+ features → shared/; 1 feature → local to that feature
- Screaming Architecture: feature names describe business, not tech; no `.component`/`.service` suffixes

### homebrew-release

- GGA: tarball from source, tags `V{version}`; Gentleman.Dots: pre-built binaries, tags `v{version}`
- Build cross-platform binaries with `GOOS/GOARCH` and `-ldflags="-s -w"`
- Create GitHub Release with `gh release create` attaching binaries; get SHA256 with `shasum -a 256`
- Update homebrew formula with version, URLs, and SHA256 hashes per platform
- `brew audit --formula` before committing formula changes

### jira-epic

- Title format: `[EPIC] Feature Name`; sections: Feature Overview, Requirements (by area), Technical Considerations
- Always include Performance, Data Integration, and UI Components subsections
- Implementation Checklist as `- [ ]` items; add Mermaid diagrams for architecture/flow
- Link Figma designs when available; be specific and testable in requirements

### jira-task

- Multi-component work → split into separate tasks per component (API, UI, SDK)
- BUGS: create independent sibling tasks; FEATURES: create parent task (user story, acceptance criteria) + child tasks (technical details)
- Parent task: user-facing description, user story, acceptance criteria from USER perspective, NO technical details
- Child task: technical details, affected files, component-specific acceptance criteria
- Title format: `[BUG]` or `[FEATURE]` + description + `(API)`/`(UI)` suffix for children

### find-skills

- Use `npx skills find [query]` to search for skills by keyword
- Use `npx skills add <package>` to install a skill from GitHub or other sources
- Browse skills at https://skills.sh/
- Run `npx skills check` for updates, `npx skills update` to update all installed skills
- Suggest skills when user asks "how do I do X" where X might have an existing skill

## Project Conventions

| File                    | Path                                                   | Notes                                                                        |
| ----------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| AGENTS.md               | ./AGENTS.md                                            | Primary index — references skill routing table, agent checklist, quick start |
| AGENTS.md               | ./.agents/skills/vercel-react-best-practices/AGENTS.md | Full Vercel React best practices guide (64 rules, 8 categories)              |
| .nvmrc                  | ./.nvmrc                                               | Runtime version (Node 22)                                                    |
| .env.example            | ./.env.example                                         | Env contract baseline                                                        |
| .cursorrules            | ./.cursorrules                                         | Bridge file — defers to AGENTS.md                                            |
| copilot-instructions.md | ./.github/copilot-instructions.md                      | Bridge file — defers to AGENTS.md                                            |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
