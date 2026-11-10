# Spec-Rails Project Roadmap

Baseline: `main` · Status: `⬜ Planned` · `🚀 In Progress` · `✅ Shipped`

Shipped history lives in [CHANGELOG.md](../CHANGELOG.md) and `openspec/changes/archive/`; this file lists only open work.

## Open items

None. Add rows as `| **W9.1** | Item | Depends on | ⬜ Planned | Notes |` when new work is planned.

## Current shape (0.6.x)

- Single command `spec-rails init`: bootstraps OpenSpec through the pinned local CLI when `openspec/` is absent, overlays CLI-free skill ports, writes the schema, rules, placeholder `Makefile`, make-based pre-commit hooks, CI skeleton and the agentic how-tos, and maintains a managed block in the root `AGENTS.md`.
- Earlier waves (protocol, pre-commit and CI, OpenSpec schema, hardening, TypeScript CLI, pure-addon simplification, ecosystem) are shipped; the `check`, `verify` and `audit` commands, stack detection and their config files were removed in 0.5.0.

## Dropped, do not re-propose

- `spec-rails scaffold-check` (AST inspection of contract scaffolding; the Red rail already proves unfulfilled contracts).
- `spec-rails lint` (duplicates `openspec validate --strict` and schema constraints).
- Language-specific runner wrappers in the core CLI (projects configure their own test, coverage and mutation commands in their `Makefile`, hooks and CI).
- Mandatory `templates/roadmap.md` and `chore/roadmap-<id>` ceremony (OpenSpec tracks changes natively via `openspec list` and `openspec/changes/archive/`).
