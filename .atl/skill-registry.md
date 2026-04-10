# Skill Registry

Orchestrator-only. Resolve paths once per session, then pass pre-resolved paths to sub-agents. Sub-agents do NOT read this file.

## User Skills

| Trigger                                                                                             | Skill                       | Path                                                  |
| --------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------- |
| When writing TypeScript code (types, interfaces, generics)                                          | typescript                  | ~/.config/opencode/skills/typescript/SKILL.md         |
| When writing React components (React 19 + compiler patterns)                                        | react-19                    | ~/.config/opencode/skills/react-19/SKILL.md           |
| When styling with Tailwind CSS v4 (`cn()`, theme variables)                                         | tailwind-4                  | ~/.config/opencode/skills/tailwind-4/SKILL.md         |
| When using Zod for validation (v4 patterns, v3 breaks)                                              | zod-4                       | ~/.config/opencode/skills/zod-4/SKILL.md              |
| When managing React state with Zustand                                                              | zustand-5                   | ~/.config/opencode/skills/zustand-5/SKILL.md          |
| When writing E2E tests with Playwright                                                              | playwright                  | ~/.config/opencode/skills/playwright/SKILL.md         |
| When creating a pull request, opening a PR, or preparing changes for review                         | branch-pr                   | ~/.config/opencode/skills/branch-pr/SKILL.md          |
| When creating a GitHub issue, reporting a bug, or requesting a feature                              | issue-creation              | ~/.config/opencode/skills/issue-creation/SKILL.md     |
| When reviewing PRs/issues backlog with structured analysis                                          | pr-review                   | ~/.config/opencode/skills/pr-review/SKILL.md          |
| When reviewing technical exercises/candidate submissions                                            | technical-review            | ~/.config/opencode/skills/technical-review/SKILL.md   |
| When creating new AI agent skills                                                                   | skill-creator               | ~/.config/opencode/skills/skill-creator/SKILL.md      |
| When user asks to find/discover/install skills                                                      | find-skills                 | ~/.agents/skills/find-skills/SKILL.md                 |
| When building polished, production-grade frontend UI (project-local override)                       | frontend-design             | ./.agents/skills/frontend-design/SKILL.md             |
| When writing/reviewing/refactoring React/Next.js for performance (project-local override)           | vercel-react-best-practices | ./.agents/skills/vercel-react-best-practices/SKILL.md |
| When auditing UI for Web Interface Guidelines and accessibility/UX quality (project-local override) | web-design-guidelines       | ./.agents/skills/web-design-guidelines/SKILL.md       |
| When running commands, validating changes, creating PRs, managing branches, or handling secrets     | spotiarr-workflow           | ./.agents/skills/spotiarr-workflow/SKILL.md           |
| When making architectural decisions, writing code across layers, or understanding repo structure    | spotiarr-architecture       | ./.agents/skills/spotiarr-architecture/SKILL.md       |
| When setting up coding assistant compatibility, adding bridge files, or managing multi-agent config | spotiarr-compatibility      | ./.agents/skills/spotiarr-compatibility/SKILL.md      |
| When writing database queries, migrations, or Prisma schemas                                        | spotiarr-prisma             | ./.agents/skills/spotiarr-prisma/SKILL.md             |
| When writing queue definitions, workers, job handlers, or cron jobs                                 | spotiarr-bullmq             | ./.agents/skills/spotiarr-bullmq/SKILL.md             |
| When adding or modifying translations, working with i18n keys, or adding a new language             | spotiarr-i18n               | ./.agents/skills/spotiarr-i18n/SKILL.md               |

## Project Conventions

| File                    | Path                              | Notes                                |
| ----------------------- | --------------------------------- | ------------------------------------ |
| AGENTS.md               | ./AGENTS.md                       | Primary human-facing source of truth |
| .nvmrc                  | ./.nvmrc                          | Runtime version                      |
| .env.example            | ./.env.example                    | Env contract baseline                |
| README.md               | ./README.md                       | Project overview                     |
| CONTRIBUTING.md         | ./CONTRIBUTING.md                 | Contribution guidelines              |
| skills-lock.json        | ./skills-lock.json                | Skill metadata and versions          |
| apps/backend            | ./apps/backend                    | Backend architecture boundary        |
| apps/frontend           | ./apps/frontend                   | Frontend architecture boundary       |
| packages/shared         | ./packages/shared                 | Shared contracts boundary            |
| .cursorrules            | ./.cursorrules                    | Bridge file — defers to AGENTS.md    |
| copilot-instructions.md | ./.github/copilot-instructions.md | Bridge file — defers to AGENTS.md    |
