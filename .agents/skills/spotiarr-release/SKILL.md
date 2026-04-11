---
name: spotiarr-release
description: >
  Release workflow for Spotiarr — bumps version in package.json, commits, tags, and pushes so GHA creates the GitHub Release.
  Trigger: When user says "sube de version", "nueva release", "publish release", "bump version", "create release", or asks to publish a new version.
license: Apache-2.0
metadata:
  author: mralexsaavedra
  version: "1.0"
---

## When to Use

- User says "sube de version", "nueva release", "publish release"
- User asks to "bump version" or "create release"
- User mentions releasing a new version of Spotiarr

## Context

- Spotiarr is a pnpm monorepo. **Only the root `package.json` has the real version.** Workspace packages (`apps/backend`, `apps/frontend`, `packages/shared`) are all `0.0.0` and private — do NOT touch them.
- Version lives in root `package.json` field `"version"`.
- GitHub Actions workflow at `.github/workflows/release.yml` triggers on `v*.*.*` tags and auto-creates a GitHub Release with changelog.
- Conventional commits are enforced (husky + commitlint).

## Release Process

### Step 1: Determine Current Version

```bash
node -e "console.log(require('./package.json').version)"
```

### Step 2: Determine Next Version

Ask the user or calculate from the bump type:

| Bump    | Example       | When                       |
| ------- | ------------- | -------------------------- |
| `patch` | 1.2.0 → 1.2.1 | Bug fixes, small changes   |
| `minor` | 1.2.0 → 1.3.0 | New features, non-breaking |
| `major` | 1.2.0 → 2.0.0 | Breaking changes           |

If user doesn't specify, suggest `patch` based on recent conventional commits:

- `fix:` → patch
- `feat:` → minor
- `BREAKING CHANGE` or `!:` → major

### Step 3: Update Version in package.json

Update ONLY the root `package.json` version field. Do NOT touch workspace packages.

### Step 4: Commit and Tag

```bash
git add package.json
git commit -m "chore(release): bump to v{VERSION}"
git tag v{VERSION}
git push origin main --tags
```

### Step 5: Verify

After push, the GHA workflow will automatically:

1. Trigger on the `v*.*.*` tag
2. Build changelog from conventional commits since last tag
3. Create a GitHub Release at `https://github.com/mralexsaavedra/spotiarr/releases`

Verify the workflow ran:

```bash
gh run list --workflow=release.yml --limit=1
```

## Rules

- **NEVER** edit version in workspace packages — they are `0.0.0` private packages.
- **ALWAYS** commit version bump as `chore(release): bump to vX.Y.Z`.
- **ALWAYS** use `v` prefix for tags (e.g., `v1.3.0`).
- **NEVER** create the GitHub Release manually — GHA handles it.
- **ALWAYS** push to `main` with `--tags` in the same command.

## Quick Reference

```bash
# Check current version
node -e "console.log(require('./package.json').version)"

# Full release (patch example)
# 1. Edit package.json version to 1.2.1
# 2. Then:
git add package.json && git commit -m "chore(release): bump to v1.2.1" && git tag v1.2.1 && git push origin main --tags

# Check release workflow status
gh run list --workflow=release.yml --limit=1
```

## Checklist

- [ ] Current version read from root `package.json`
- [ ] Next version determined (patch/minor/major)
- [ ] Root `package.json` version updated (NOT workspace packages)
- [ ] Committed as `chore(release): bump to vX.Y.Z`
- [ ] Tag created as `vX.Y.Z`
- [ ] Pushed to main with tags
- [ ] GHA workflow triggered and completed
