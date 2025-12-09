# Commit Message Guidelines

This project uses **Conventional Commits** via `commitlint`. All commit messages MUST follow this format:

```
<type>(<scope>): <subject>
```

## Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
- `ci`: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

## Rules

1. **Subject must be lowercase**: `feat: add new feature` (NOT `feat: Add new feature`)
2. **No period at the end**: `fix: resolve crash` (NOT `fix: resolve crash.`)
3. **Use imperative mood**: "add" not "added", "change" not "changed".

## Examples

✅ `feat: add user authentication`
✅ `fix(auth): handle expired tokens`
✅ `chore: update dependencies`

❌ `Feat: Add user authentication` (Uppercase type/subject)
❌ `fix: fixed the bug.` (Past tense, period at end)
