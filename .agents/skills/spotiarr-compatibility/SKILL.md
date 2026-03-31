---
name: spotiarr-compatibility
description: >
  Maintains coding-assistant compatibility files and bridge configuration for spotiarr.
  Trigger: When setting up coding assistant compatibility, adding bridge files, or managing multi-agent configuration in spotiarr.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

Use this skill when:

- Adding or validating coding-assistant bridge files.
- Creating/updating compatibility symlinks.
- Maintaining multi-agent configuration and registry consistency.

---

## Critical Patterns

### Single source of truth

- `AGENTS.md` is the canonical source.
- Keep all compatibility references synced if `AGENTS.md` is restructured.

### Required symlinks (all -> `AGENTS.md`)

- `CLAUDE.md` — Claude Code
- `CODEX.md` — OpenAI Codex
- `GEMINI.md` — Gemini CLI
- `OPENCODE.md` — OpenCode

### Dedicated bridge files

- `.cursorrules` — Cursor
- `.windsurfrules` — Windsurf
- `.github/copilot-instructions.md` — GitHub Copilot / VSCode

### Registry files

- `.atl/skill-registry.md` — skill-name to path mapping for orchestrator-style agents
- `skills-lock.json` — skill metadata tracking

### Maintenance rules

- If architecture/commands/workflows change: update `AGENTS.md`.
- Update `README.md` and/or `CONTRIBUTING.md` when relevant flows change.
- Keep documented Node/pnpm versions aligned with actual runtime.

---

## Commands

```bash
ln -sf AGENTS.md CLAUDE.md && ln -sf AGENTS.md CODEX.md && ln -sf AGENTS.md GEMINI.md && ln -sf AGENTS.md OPENCODE.md  # Refresh compatibility symlinks
ls -l CLAUDE.md CODEX.md GEMINI.md OPENCODE.md  # Verify symlink targets
```

---

## Resources

- **Documentation**: `AGENTS.md`, `README.md`, `CONTRIBUTING.md`
- **Registry**: `.atl/skill-registry.md`, `skills-lock.json`
