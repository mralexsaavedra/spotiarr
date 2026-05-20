---
name: spotiarr-release
description: "Trigger: release, version bump, nueva release, publish, tag, changelog. spotiarr release: bump root package.json, CHANGELOG, git tag -a, gh release edit."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Load when bumping version, writing CHANGELOG, tagging, or publishing a GitHub Release.

## Hard Rules

- **Only root `package.json` has the real version.** Workspace packages are `0.0.0` private — never touch them.
- **`git tag` without `-a -m` opens nvim interactively** — ALWAYS use `git tag -a vX.Y.Z -m "vX.Y.Z"`.
- **Never pass `--title` to `gh release edit`** — the release `name` field stays as the tag. The descriptive title lives as the H1 heading inside the release body.
- GHA auto-creates the release with a generic description — always replace it with a proper one.

## Execution Steps

```bash
# 1. Check current version
node -e "console.log(require('./package.json').version)"

# 2. Update CHANGELOG.md (see references/changelog-format.md)

# 3. Bump version in root package.json only

# 4. Commit, tag, push
git add package.json CHANGELOG.md
git commit -m "chore(release): bump to vX.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin main --tags

# 5. Update GitHub Release body (no --title flag)
gh release edit vX.Y.Z --notes "$(cat skills/spotiarr-release/assets/release-body-template.md)"

# 6. Verify
gh release view vX.Y.Z
gh run list --workflow=release.yml --limit=1
```

## Decision Gates

| Commits since last release    | Bump type |
| ----------------------------- | --------- |
| `fix:` only                   | patch     |
| `feat:` present               | minor     |
| `BREAKING CHANGE` or `feat!:` | major     |

**Release body H1 emoji:** 🚀 features · 🐛 bug fix · ⚡ performance · 🛡️ reliability · 🔧 maintenance

## References

- Release body template: `skills/spotiarr-release/assets/release-body-template.md`
- CHANGELOG format: `skills/spotiarr-release/assets/changelog-format.md`
- Previous release style: `gh release view $(gh release list --limit 1 --json tagName -q '.[0].tagName')`
