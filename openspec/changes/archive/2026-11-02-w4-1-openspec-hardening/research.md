# Research & Technical Tradeoffs

## 1. Intent & Ground Truth
Audit of `spec-rails` as an addon for `fission-ai/openspec` v1.15/v1.16 exposed critical boundary and rail-integrity defects: transitive/`skip_specs`/missing-upstream gate bypasses in `bin/spec-rails-check`, self-matching `Evidence:` placeholder in `tasks.md`, substring/empty-dir traceability bugs in `bin/spec-rails-verify`, hardcoded repo-local paths breaking OpenSpec 1.15 Stores, `Makefile`-coupled `.pre-commit-config.yaml` breaking Day-1 adopters, symlink/worktree hazards in `bin/spec-rails`, and dot-named change IDs rejected by OpenSpec CLI.

## 2. Options Explored
- **Option A (In-Place POSIX Hardening)**: Fix `jq`/POSIX shell logic across `bin/*`, `schemas/`, `templates/`, `rules/`, `skills/`, `docs/`, and `tests/` with zero new runtime dependencies.
- **Option B (Node/TypeScript Rewrite)**: Rewrite checks as a Node CLI bundling `@fission-ai/openspec` internals.
- **Option C (Fork OpenSpec)**: Maintain patched OpenSpec commands directly.

## 3. Tradeoff Matrix

| Criteria | Option A | Option B | Option C |
| :--- | :--- | :--- | :--- |
| **Complexity** | Low | Medium | High |
| **New Dependencies** | None (`sh`, `jq`, `git`, `openspec`) | Node runtime + build | Full fork maintenance |
| **Performance & Latency** | < 1s | ~1-2s startup | ~1-2s |
| **Maintenance Burden** | Minimal | Medium | High |
| **Blast Radius** | Contained to existing scripts/templates | Replaces all entrypoints | Breaks addon model |

## 4. Recommendation
Option A: preserve strict YAGNI and `NFR-OSA-1` (pure POSIX `sh` + `jq`) while closing every boundary, rail, and security gap.

## 5. Breaking Changes & Deprecations
Updates `REQ-OSA-10` (`w3.1-<slug>` -> `w3-1-<slug>`), `REQ-OSA-12`, `REQ-OSA-14`, `REQ-OSA-16`, `REQ-OSA-21`, `REQ-OSA-22`, `REQ-OSA-26`, `REQ-OSA-27`; adds `REQ-OSA-31` and `REQ-OSA-32`.

## Review Gate
- [x] **Gate 0 Decision**: Go (Option A).
