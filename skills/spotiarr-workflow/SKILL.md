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

- No automated test suite — CI runs lint + build only. Human verification required for behaviour changes.
- Never commit `.env`, tokens, or credentials. Use `.env.example` as source of truth.
- Never bypass pre-commit hooks (`--no-verify` is forbidden).
- External services required locally: **Redis**, **FFmpeg**, **yt-dlp**, **Python 3.11/3.12**.

## Decision Gates

| Scope                     | Validate with                                                          |
| ------------------------- | ---------------------------------------------------------------------- |
| Frontend only             | `pnpm --filter frontend run lint` → `pnpm --filter frontend run build` |
| Backend only              | `pnpm --filter backend run lint` → `pnpm --filter backend run build`   |
| Shared or cross-workspace | `pnpm lint` → `pnpm build`                                             |

## Execution Steps

**Branch naming:**

| Type     | Prefix      | Example                      |
| -------- | ----------- | ---------------------------- |
| Feature  | `feat/`     | `feat/add-playback-retry`    |
| Fix      | `fix/`      | `fix/sse-reconnect-loop`     |
| Refactor | `refactor/` | `refactor/backend-di-wiring` |
| Docs     | `docs/`     | `docs/update-env-guide`      |
| Chore    | `chore/`    | `chore/bump-deps`            |

**PR checklist:** branch up to date with `main` · lint + build passing · PR body has what/why/verification · screenshots for UI changes.

**Key commands:**

```bash
pnpm dev                                    # full dev stack
pnpm lint && pnpm build                     # broad validation
pnpm --filter backend run prisma:migrate:deploy
gh pr create                                # title must follow Conventional Commits
```
