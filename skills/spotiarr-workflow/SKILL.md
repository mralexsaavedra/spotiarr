---
name: spotiarr-workflow
description: "Trigger: command, validate, PR, branch, run lint, run build, secrets. Correct pnpm commands, branch naming, PR checklist, and secrets rules for spotiarr."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Load when running commands, validating changes, creating PRs, managing branches, or checking secrets.

## Hard Rules

- CI runs lint, tests, and build as separate jobs. Automated tests cover backend and frontend utilities.
- Never commit `.env`, tokens, or credentials. Use `.env.example` as source of truth.
- Never bypass pre-commit hooks (`--no-verify` is forbidden).
- External services required locally: **Redis**, **FFmpeg**, **yt-dlp**, **Python 3.11/3.12**.

## Decision Gates

| Scope                     | Validate with                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Frontend only             | `pnpm --filter frontend run lint` → `pnpm --filter frontend run test:run` → `pnpm --filter frontend run build` |
| Backend only              | `pnpm --filter backend run lint` → `pnpm --filter backend run test:run` → `pnpm --filter backend run build`    |
| Shared or cross-workspace | `pnpm lint` → `pnpm test` → `pnpm build`                                                                       |

## Execution Steps

**Branch naming:**

| Type     | Prefix      | Example                      |
| -------- | ----------- | ---------------------------- |
| Feature  | `feature/`  | `feature/add-playback-retry` |
| Fix      | `fix/`      | `fix/sse-reconnect-loop`     |
| Refactor | `refactor/` | `refactor/backend-di-wiring` |
| Docs     | `docs/`     | `docs/update-env-guide`      |
| Chore    | `chore/`    | `chore/bump-deps`            |

**PR checklist:** branch up to date with `main` · lint + build passing · PR body has what/why/verification · screenshots for UI changes.

**Key commands:**

```bash
pnpm dev                                    # full dev stack
pnpm lint && pnpm test && pnpm build        # broad validation
pnpm test                                   # all workspace tests
pnpm --filter frontend run test:run         # frontend unit tests
pnpm --filter backend run test:run          # backend unit tests
pnpm --filter backend run prisma:migrate:deploy
gh pr create                                # title must follow Conventional Commits
```
