# Skill Registry

**Orchestrator use only.** Read this registry once per session to resolve skill paths, then pass pre-resolved paths directly to each sub-agent's launch prompt. Sub-agents receive the path and load the skill directly — they do NOT read this registry.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When creating a pull request, opening a PR, or preparing changes for review. | branch-pr | /Users/mralexsaavedra/.claude/skills/branch-pr/SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature. | issue-creation | /Users/mralexsaavedra/.claude/skills/issue-creation/SKILL.md |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen". | judgment-day | /Users/mralexsaavedra/.claude/skills/judgment-day/SKILL.md |
| When user wants to review PRs, analyze issues, or audit PR/issue backlog. | pr-review | /Users/mralexsaavedra/.claude/skills/pr-review/SKILL.md |
| When reviewing technical exercises, code assessments, candidate submissions, or take-home tests. | technical-review | /Users/mralexsaavedra/.claude/skills/technical-review/SKILL.md |
| When user asks to release, bump version, update homebrew, or publish a new version. | homebrew-release | /Users/mralexsaavedra/.claude/skills/homebrew-release/SKILL.md |
| When writing TypeScript code - types, interfaces, generics. | typescript | /Users/mralexsaavedra/.claude/skills/typescript/SKILL.md |
| When styling with Tailwind - cn(), theme variables, no var() in className. | tailwind-4 | /Users/mralexsaavedra/.claude/skills/tailwind-4/SKILL.md |
| When writing E2E tests - Page Objects, selectors, MCP workflow. | playwright | /Users/mralexsaavedra/.claude/skills/playwright/SKILL.md |
| When working with Next.js - routing, Server Actions, data fetching. | nextjs-15 | /Users/mralexsaavedra/.claude/skills/nextjs-15/SKILL.md |
| When building AI chat features - breaking changes from v4. | ai-sdk-5 | /Users/mralexsaavedra/.claude/skills/ai-sdk-5/SKILL.md |
| When user asks to create a Jira task, ticket, or issue. | jira-task | /Users/mralexsaavedra/.claude/skills/jira-task/SKILL.md |
| When writing Angular components, services, templates, or making architectural decisions about component placement. | scope-rule-architect-angular | /Users/mralexsaavedra/.claude/skills/angular/SKILL.md |
| When writing Python tests - fixtures, mocking, markers. | pytest | /Users/mralexsaavedra/.claude/skills/pytest/SKILL.md |
| When building a presentation, slide deck, course material, stream web, or talk slides. | stream-deck | /Users/mralexsaavedra/.claude/skills/stream-deck/SKILL.md |
| When writing React components - no useMemo/useCallback needed. | react-19 | /Users/mralexsaavedra/.claude/skills/react-19/SKILL.md |
| When using Zod for validation - breaking changes from v3. | zod-4 | /Users/mralexsaavedra/.claude/skills/zod-4/SKILL.md |
| When user asks to create an epic, large feature, or multi-task initiative. | jira-epic | /Users/mralexsaavedra/.claude/skills/jira-epic/SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI. | skill-creator | /Users/mralexsaavedra/.claude/skills/skill-creator/SKILL.md |
| When building REST APIs with Django - ViewSets, Serializers, Filters. | django-drf | /Users/mralexsaavedra/.claude/skills/django-drf/SKILL.md |
| When writing C# code, .NET APIs, or Entity Framework models. | dotnet | /Users/mralexsaavedra/.claude/skills/dotnet/SKILL.md |
| When writing Go tests, using teatest, or adding test coverage. | go-testing | /Users/mralexsaavedra/.claude/skills/go-testing/SKILL.md |
| When managing React state with Zustand. | zustand-5 | /Users/mralexsaavedra/.claude/skills/zustand-5/SKILL.md |
| When adding or modifying translations, working with i18n keys, or adding a new language. | spotiarr-i18n | /Users/mralexsaavedra/Developer/spotiarr/.agents/skills/spotiarr-i18n/SKILL.md |
| When writing queue definitions, workers, job handlers, or cron jobs in the backend. | spotiarr-bullmq | /Users/mralexsaavedra/Developer/spotiarr/.agents/skills/spotiarr-bullmq/SKILL.md |
| When writing database queries, migrations, or Prisma schemas. | spotiarr-prisma | /Users/mralexsaavedra/Developer/spotiarr/.agents/skills/spotiarr-prisma/SKILL.md |
| When making architectural decisions, writing code across layers, adding new features, or understanding the repo structure in spotiarr. | spotiarr-architecture | /Users/mralexsaavedra/Developer/spotiarr/.agents/skills/spotiarr-architecture/SKILL.md |
| When running commands, validating changes, creating PRs, managing branches, or handling secrets in this repo. | spotiarr-workflow | /Users/mralexsaavedra/Developer/spotiarr/.agents/skills/spotiarr-workflow/SKILL.md |
| When setting up coding assistant compatibility, adding bridge files, or managing multi-agent configuration in spotiarr. | spotiarr-compatibility | /Users/mralexsaavedra/Developer/spotiarr/.agents/skills/spotiarr-compatibility/SKILL.md |
| When asked to review UI, check accessibility, audit design, review UX, or check a site against best practices. | web-design-guidelines | /Users/mralexsaavedra/Developer/spotiarr/.agents/skills/web-design-guidelines/SKILL.md |
| When writing, reviewing, or refactoring React/Next.js code for performance improvements. | vercel-react-best-practices | /Users/mralexsaavedra/Developer/spotiarr/.agents/skills/vercel-react-best-practices/SKILL.md |
| When asked to build web components, pages, dashboards, applications, or beautify web UI. | frontend-design | /Users/mralexsaavedra/Developer/spotiarr/.agents/skills/frontend-design/SKILL.md |

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | /Users/mralexsaavedra/Developer/spotiarr/AGENTS.md | Index — references files below |
| .nvmrc | /Users/mralexsaavedra/Developer/spotiarr/.nvmrc | Referenced by AGENTS.md |
| .atl/skill-registry.md | /Users/mralexsaavedra/Developer/spotiarr/.atl/skill-registry.md | Referenced by AGENTS.md |
| .cursorrules | /Users/mralexsaavedra/Developer/spotiarr/.cursorrules | Standalone bridge file; defers to AGENTS.md |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
