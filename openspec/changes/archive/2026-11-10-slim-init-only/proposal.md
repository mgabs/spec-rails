# Proposal

## Intent
Reduce spec-rails to a single idempotent `init` that wraps the locally installed `openspec` CLI: `init` runs `openspec init` for the chosen agents, then overlays the spec-rails schema and makes the generated skills CLI-free. The CLI is needed only at init time; day-to-day work needs neither `openspec` nor `spec-rails`, and the target repo gains no dependency.

## Problem Statement
Target repos today depend on the `openspec` CLI (the `openspec-*` skills shell out to it, and `init` hard-requires it) and, historically, on `spec-rails check|verify|audit`. `init` is not idempotent (it throws if `spec-rails.config.json` exists), detects stacks, copies presets and writes a config that only the removed runtime commands read. About 1000 lines of runtime code exist to serve a gate engine the developer should own.

## Capabilities

### New Capabilities
- `pinned-openspec-scaffold`: the pinned OpenSpec version (one file), the init-time wrapper around the local `openspec init --tools`, the overlay that makes generated skills CLI-free, and a maintainer upgrade script.

### Modified Capabilities
- `openspec-addon`: `init` becomes the only command, idempotent, wraps `openspec init` when bootstrapping, needs `openspec` only for that bootstrap, no stack detection, no config file; gate-engine requirements (check/verify/audit, traceability, evidence, presets, rails.conf) are removed; quality gates stay a placeholder.

## Scope

### In-Scope
- Delete `check`, `verify`, `audit`, `config`, presets, mutation templates, `rails.conf` template and their tests; `cli.ts` registers `init` only.
- `init [dir] [--tools <list>]`: when `openspec/` is absent, require the local `openspec` at the pinned version and run `openspec init --tools <list>` (default `agents`) so OpenSpec generates every per-agent artifact itself; then overlay `schema: spec-rails`, the schema, workflow docs, TODO placeholder, CI skeleton, pre-commit placeholder and `.gitignore` entry. When `openspec/` exists, `init` re-applies the overlay without needing `openspec`. Repeat runs produce no diff and no error.
- Overlay of generated skills and commands, for every agent layout OpenSpec wrote: keep the agent-specific path and frontmatter, replace the body with the CLI-free spec-rails port for the six workflows (explore, propose, apply, archive, sync, update), and strip `allowed-tools: Bash(openspec:*)` and `user-invocable: false`. Workflows without a port are left as generated and listed as needing the CLI.
- One pinned version file plus `scripts/upgrade-openspec.mjs <version>`: regenerates the reference snapshot with the upstream version and prints the skill diff for the maintainer to port; a drift test fails when ports lag the pin.
- Keep removing stale legacy artifacts (v0.1 scripts, mutmut, rails.conf) idempotently.
- Docs, CHANGELOG, major version bump (0.5.0 or 1.0.0 decided in design).

### Out-of-Scope (YAGNI)
- Any runtime gate, coverage or mutation enforcement, stack detection, presets, config JSON.
- Publishing to npm; vendoring any binary into target repos.
- Re-implementing OpenSpec features beyond the six workflow skills (no validate, no store/multi-repo support).
- Automating the skill rewrite itself; upgrades are a maintainer-reviewed diff.

## Assumptions
- **ASM-GEN-1**: "Pinned version" means OpenSpec 1.16.0 (the version already in use) as the initial snapshot.
- **ASM-GEN-2**: Delivery remains `npx github:<owner>/spec-rails init` (or a local checkout); the target repo never lists spec-rails as a dependency.
- **ASM-GEN-3**: Existing `spec-rails.config.json` files in target repos are legacy and removed on init.
- **ASM-GEN-4**: The `.openspec.yaml`/`status`-style metadata the skills need is expressible from schema files plus directory listings.
- **ASM-GEN-5**: "Local installation" means the `openspec` on the developer's `PATH`; `init` refuses a version that differs from the pin in major.minor, since generated templates change between releases.
- **ASM-GEN-6**: The developer upgrades OpenSpec by running `openspec update` and then `spec-rails init`, which re-applies the overlay.

## Success Metrics
- A fresh empty repo plus `init` gives a working `openspec/` tree and skills; `git status` after a second `init` is clean, and the second run works with `openspec` removed from `PATH`.
- Target repo `package.json`/lockfile untouched; no `openspec` or `spec-rails` binary referenced by any generated file.
- `src/` contains only `init` and its helpers; code and test line count drop by at least 60%.
- `scripts/upgrade-openspec.mjs 1.16.0` reproduces the committed snapshot byte for byte.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs. -- Go (human)
