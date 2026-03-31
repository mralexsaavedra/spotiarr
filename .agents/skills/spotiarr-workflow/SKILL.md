---
name: spotiarr-workflow
description: >
  Operational workflow for running commands, validating changes, creating PRs,
  managing branches, and handling secrets in the Spotiarr monorepo.
  Trigger: When running commands, validating changes, creating PRs, managing branches, or handling secrets in this repo.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

Use this skill when:

- You need the correct `pnpm` command for root, backend, frontend, or shared workspaces.
- You are validating changes before commit/PR.
- You are preparing branches and PRs using this repo's naming/checklist conventions.
- You need a quick security checklist to avoid leaking secrets.

---

## Critical Patterns

### Pattern 1: Run the smallest valid command set first

| Change Scope            | Run First                         | Then Run                           |
| ----------------------- | --------------------------------- | ---------------------------------- |
| Frontend-only           | `pnpm --filter frontend run lint` | `pnpm --filter frontend run build` |
| Backend-only            | `pnpm --filter backend run lint`  | `pnpm --filter backend run build`  |
| Shared or broad changes | `pnpm lint`                       | `pnpm build`                       |

**Note**: CI validates `lint + build`. No repository-level automated test suite is configured yet.

### Pattern 2: Branch and PR discipline

| Intent   | Branch Prefix | Example                      |
| -------- | ------------- | ---------------------------- |
| Feature  | `feat/`       | `feat/add-playback-retry`    |
| Fix      | `fix/`        | `fix/sse-reconnect-loop`     |
| Refactor | `refactor/`   | `refactor/backend-di-wiring` |
| Docs     | `docs/`       | `docs/update-env-guide`      |
| Chore    | `chore/`      | `chore/bump-deps`            |

PR must include:

1. Branch up to date with `main`.
2. Lint + build passing for affected scope.
3. PR body with **what changed**, **why**, and **verification steps**.
4. Screenshots/GIFs for UI-facing changes.

### Pattern 3: Secrets never enter git history

- Never commit `.env`, credentials, or tokens.
- Use `.env.example` as the source of truth for required variables.
- Document new config vars in `README.md` and/or `CONTRIBUTING.md`.
- Do not log sensitive data.

---

## Decision Tree

| Question                                               | Action                                                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Only frontend files changed?                           | Run frontend lint + build.                                                                     |
| Only backend files changed?                            | Run backend lint + build.                                                                      |
| Shared package touched or multiple workspaces touched? | Run repo-wide `pnpm lint` + `pnpm build`.                                                      |
| Need to open a PR?                                     | Ensure branch naming convention, verify checks, create with `gh pr create` conventional title. |
| Unsure about config/secrets safety?                    | Treat as sensitive, compare against `.env.example`, avoid committing/logging secrets.          |

---

## Commands

```bash
# Root
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm clean

# Backend
pnpm --filter backend run dev
pnpm --filter backend run build
pnpm --filter backend run lint
pnpm --filter backend run prisma:migrate:deploy

# Frontend
pnpm --filter frontend run dev
pnpm --filter frontend run build
pnpm --filter frontend run lint
pnpm --filter frontend run preview

# Shared
pnpm --filter @spotiarr/shared run build
pnpm --filter @spotiarr/shared run lint

# PR creation (title should be conventional, e.g. feat:, fix:)
gh pr create
```

---

## Resources

- **Documentation**: `AGENTS.md` (single source of workflow conventions for this repo)
