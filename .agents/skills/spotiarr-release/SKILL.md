---
name: spotiarr-release
description: >
  Release workflow for Spotiarr — bumps version in package.json, writes CHANGELOG,
  commits, tags, pushes, and updates the GitHub Release description.
  Trigger: When user says "sube de version", "nueva release", "publish release", "bump version", "create release", or asks to publish a new version.
license: Apache-2.0
metadata:
  author: mralexsaavedra
  version: "1.1"
---

## When to Use

- User says "sube de version", "nueva release", "publish release"
- User asks to "bump version" or "create release"
- User mentions releasing a new version of Spotiarr

## Context

- Spotiarr is a pnpm monorepo. **Only the root `package.json` has the real version.** Workspace packages (`apps/backend`, `apps/frontend`, `packages/shared`) are all `0.0.0` and private — do NOT touch them.
- Version lives in root `package.json` field `"version"`.
- GitHub Actions workflow at `.github/workflows/release.yml` triggers on `v*.*.*` tags and auto-creates a GitHub Release — but with a **generic description**. The real description must be written manually (Step 5).
- Conventional commits are enforced (husky + commitlint).
- **`git tag` without `-m` opens nvim interactively — ALWAYS use `git tag -a vX.Y.Z -m "vX.Y.Z"`.**

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

If user doesn't specify, suggest based on recent conventional commits:

- `fix:` only → patch
- `feat:` present → minor
- `BREAKING CHANGE` or `!:` → major

### Step 3: Update CHANGELOG.md

Add an entry at the top of `CHANGELOG.md` (below the header, above the previous release).

**Format**:

```markdown
## [X.Y.Z](https://github.com/mralexsaavedra/spotiarr/compare/vPREV...vX.Y.Z) (YYYY-MM-DD)

### Bug Fixes

- **Scope**: Human-readable description of what was wrong and what was fixed. ([commitsha](https://github.com/mralexsaavedra/spotiarr/commit/commitsha))

### Features

- **Scope**: Description. ([commitsha](https://github.com/mralexsaavedra/spotiarr/commit/commitsha))
```

Rules:

- Write **human-readable descriptions** — not raw commit messages
- Focus on **what was wrong** and **what the user experiences differently**
- Group by type: Bug Fixes, Features, Breaking Changes, Performance
- Omit `chore:` and `docs:` commits — they are not user-facing

### Step 4: Update version in package.json

Update ONLY the root `package.json` version field. Do NOT touch workspace packages.

### Step 5: Commit, Tag and Push

```bash
git add package.json CHANGELOG.md
git commit -m "chore(release): bump to vX.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z"   # ALWAYS -a -m — never bare git tag (opens nvim)
git push origin main --tags
```

### Step 6: Commit the CHANGELOG separately (after push)

```bash
# If CHANGELOG was not included in step 5 commit:
git add CHANGELOG.md
git commit -m "docs(changelog): add vX.Y.Z release notes"
git push
```

### Step 7: Update the GitHub Release description

GHA auto-creates the release with a generic description. **Always replace it** with a proper one using:

```bash
gh release edit vX.Y.Z --title "EMOJI SpotiArr vX.Y.Z — Short Subtitle" --notes "$(cat <<'EOF'
# EMOJI SpotiArr vX.Y.Z — Short Subtitle

One paragraph explaining the theme of this release and who should update.

---

## 🔴 The Problem(s)

Explain what was broken or missing from the user's perspective.
No need to mention file names or internal details — focus on symptoms.

---

## ✅ The Fix(es)

Explain what changed and what the user experiences differently.

---

## 📦 Updating

\`\`\`bash
docker compose pull
docker compose up -d
\`\`\`
EOF
)"
```

**Release title emoji guide**:

- 🚀 New features / minor or major release
- 🛡️ Security / resilience / reliability fixes
- 🐛 Bug fix patch release
- ⚡ Performance improvements
- 🔧 Configuration / maintenance

**Look at previous releases for tone and style reference**:

```bash
gh release view vPREV
```

### Step 8: Verify

```bash
gh run list --workflow=release.yml --limit=1
gh release view vX.Y.Z
```

---

## Rules

- **NEVER** edit version in workspace packages — they are `0.0.0` private packages.
- **ALWAYS** commit version bump as `chore(release): bump to vX.Y.Z`.
- **ALWAYS** use `git tag -a vX.Y.Z -m "vX.Y.Z"` — bare `git tag` opens nvim interactively.
- **ALWAYS** write a proper GitHub Release description — the GHA-generated one is generic and not user-friendly.
- **ALWAYS** update CHANGELOG.md with human-readable entries before or after the release commit.
- **NEVER** push `--force` to main.

---

## Checklist

- [ ] Current version read from root `package.json`
- [ ] Next version determined (patch/minor/major)
- [ ] `CHANGELOG.md` updated with human-readable entries
- [ ] Root `package.json` version updated (NOT workspace packages)
- [ ] Committed as `chore(release): bump to vX.Y.Z`
- [ ] Tag created as `git tag -a vX.Y.Z -m "vX.Y.Z"` (NOT bare tag)
- [ ] Pushed to main with `--tags`
- [ ] GHA workflow triggered and completed
- [ ] GitHub Release description updated via `gh release edit`
- [ ] `docs(changelog)` commit pushed if CHANGELOG was separate
