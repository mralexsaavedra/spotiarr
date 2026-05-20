# CHANGELOG Entry Format

Add at the top of `CHANGELOG.md`, below the header, above the previous entry.

```markdown
## [X.Y.Z](https://github.com/mralexsaavedra/spotiarr/compare/vPREV...vX.Y.Z) (YYYY-MM-DD)

### Bug Fixes

- **scope**: Human-readable description of what was wrong and what changed. ([abc1234](https://github.com/mralexsaavedra/spotiarr/commit/abc1234))

### Features

- **scope**: Description of new capability. ([abc1234](https://github.com/mralexsaavedra/spotiarr/commit/abc1234))
```

**Rules:**

- Write human-readable descriptions — not raw commit messages.
- Focus on what the user experiences differently.
- Group by: Bug Fixes · Features · Breaking Changes · Performance.
- Omit `chore:` and `docs:` commits — not user-facing.
