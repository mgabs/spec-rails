# Proposal

## Intent
Make the dependency contract honest and Node-only: `NFR-OSA-1` states the distribution (single-file bundle, zero runtime deps) and the prerequisites (Node >= 18, OpenSpec, no `jq`), the shell trampoline clause is dropped, and the mutation threshold is one value (>= 95%) everywhere.

## Problem Statement
The living spec requires shell trampolines that the author no longer wants, while the code still ships real shell scripts that need `jq`. `package.json` lists bundled libraries as runtime dependencies, contradicting "zero runtime production dependencies". The mutation threshold is stated as 90%, 95% and 100% in different files, so agents and adopters cannot tell which rail applies.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `openspec-addon`: MODIFIED `NFR-OSA-1` (Dependencies): distribution and prerequisites only, no trampoline clause. MODIFIED `NFR-OSA-5` (Rails): unchanged at >= 95% mutation kill, with the wording made the single source of truth.

## Scope

### In-Scope
- Rewrite `NFR-OSA-1` in a delta spec: Node >= 18, single-file `dist/cli.js`, zero runtime production dependencies, no `jq`, OpenSpec on PATH; remove the trampoline sentence.
- Move `zod`, `cac` and `fast-glob` from `dependencies` to `devDependencies` in `package.json` (and the lockfile); they are bundled by `tsup`.
- Fix every "> 90%" and "100%" mutation statement to ">= 95%": `rules/WORKFLOW.md`, `rules/AGENTS.md`, `skills/spec-rails/SKILL.md`, `schemas/spec-rails/schema.yaml`, `schemas/spec-rails/templates/tasks.md` and `design.md`, `templates/rails.conf`, `templates/roadmap.md`, `templates/mutation/*`, `docs/WAY_OF_WORKING.md`, `docs/DESIGN.md`, `docs/WIKI.md`, `docs/how-tos/03-parallel-worktrees-multi-agent.md`; sync installed copies.
- Add a W5.3 roadmap note that deleting `bin/` and switching the hook and CI to `npx spec-rails` happens there.

### Out-of-Scope (YAGNI)
- Porting `check` to TypeScript, deleting `bin/` or changing the hook, CI or installer entry points (W5.3).
- Removing `jq` from the README prerequisites or `rules/WORKFLOW.md` §7 before W5.3 ships.
- Any change to coverage thresholds or to `spec-rails-verify` behavior.
- Per-stack configurable mutation thresholds.

## Assumptions
- **ASM-GEN-1**: Node >= 18 is acceptable for Go, Rust and Python adopters (author-confirmed).
- **ASM-GEN-2**: `w5-2` is archived first, or its `NFR-OSA-1` and `NFR-OSA-5` wording is identical, so the deltas do not conflict.
- **ASM-GEN-3**: 95% is the canonical mutation threshold (author-confirmed).

## Success Metrics
- `NFR-OSA-1` contains no trampoline text; `package.json` has no runtime `dependencies` for bundled libraries.
- A search finds no mutation threshold other than 95% in shipped docs, rules, schema, skills and templates.
- `make test` green (selfcopy in sync) and 100% requirement traceability.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
