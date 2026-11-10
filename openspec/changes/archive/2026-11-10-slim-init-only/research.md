# Research & Technical Tradeoffs

## 1. Intent & Ground Truth
Goal: spec-rails is a one-shot scaffolder. A target repo ends up with files only: no `openspec` CLI, no `spec-rails` package, no dependency of any kind.

Human direction (this change):
- Keep only `init`; delete `check`, `verify`, `audit`.
- No stack detection, presets or `spec-rails.config.json`.
- Idempotent: running `init` repeatedly converges to the same tree with no error and no `--force`.
- No `openspec` CLI needed: `init` creates the `openspec/` tree itself from a version of OpenSpec pinned inside spec-rails.
- No rails enforcement: only a placeholder (TODO/CI skeleton) for the developer to fill in.

Verified in the codebase:
- `src/commands/init.ts` (428 lines) already only copies files and patches text; it needs `openspec/` to exist and throws if `spec-rails.config.json` exists without `--force` (not idempotent).
- Runtime code: `check.ts` 469, `verify.ts` 256, `audit.ts` 125, `config.ts` 120 lines; `cli.ts` registers all four commands. Only `init` is needed.
- Stack/preset/config code in `init.ts` (`detectStack`, `getStackMeta`, `findPresetsDir`, `templates/presets`, `templates/mutation`, `templates/rails.conf`) exists only to feed the runtime commands.
- OpenSpec scaffold today comes from `openspec init` (1.16.0): `openspec/config.yaml`, `openspec/specs/`, `openspec/changes/`, and skills/prompts in `.agents/skills`, `.github/skills`, `.github/prompts`, `.claude/...`. This repo's own checked-in copies are the reference snapshot.
- The `openspec-*` skills shell out to `openspec status|instructions|new change`. Without the CLI those steps fail. This is the main risk (see Recommendation).

## 2. Options Explored
- **A. Slim init, pinned OpenSpec snapshot vendored in spec-rails.** `init` copies a committed snapshot (config.yaml skeleton, schema `spec-rails`, `specs/`, `changes/` placeholders, skills) into the target; idempotent copy-if-absent / refresh-managed-files. Delete `check/verify/audit/config` and presets. Skills keep working only where a developer has the openspec CLI on their machine (not in the repo).
- **B. Slim init plus CLI-free skills.** As A, but rewrite the `openspec-*` skills to operate on files directly (no `openspec` calls). Fully honours "no openspec CLI" end to end; large rewrite and diverges from upstream OpenSpec.
- **C. Skill-only, no code.** The `spec-rails` skill instructs the agent to copy files from a pinned tag. No CLI at all; non-deterministic and untestable.

## 3. Tradeoff Matrix

| Criteria | Option A | Option B | Option C |
| :--- | :--- | :--- | :--- |
| **Complexity** | Low (~100 lines + deletions) | High (rewrite skills) | Lowest code, fuzzy behavior |
| **New Dependencies** | None in target | None in target | None |
| **Performance & Latency** | Instant | Instant | Agent-dependent |
| **Maintenance Burden** | Re-snapshot on OpenSpec bump | Own the skill fork forever | Prose drift |
| **Blast Radius** | init, cli, templates, specs, docs | A plus every skill | Skill only, no gates |

## 4. Recommendation
Option A: delete everything except `init`, vendor a pinned OpenSpec 1.16.0 scaffold, make `init` an idempotent copy. Skills are shipped unchanged; the openspec CLI stays an optional developer-machine tool, never a repo dependency. If you require the skills themselves to run with no CLI anywhere, that is Option B and should be a separate follow-up change.

## 5. Breaking Changes & Deprecations
**Revision (human, after Gate 0)**: Option B is realised as a wrapper, not a rewrite: `init` runs the local `openspec init --tools <list>` only when bootstrapping, then overlays CLI-free ports onto whatever agent layouts OpenSpec generated; day-two work needs no CLI. The per-agent adapter table is dropped.

In `openspec/specs/openspec-addon/spec.md` (exact set fixed in the specs artifact):
- Removed: gate/lane/DAG checks and status source (REQ-OSA-16..18, 42, 43), traceability/evidence/verifier (REQ-OSA-26, 27, 39, NFR-OSA-9), stack detection/presets/test globs (REQ-OSA-36, 38, 54), config JSON and rails.conf (REQ-OSA-44), strict rails execution and gate baseline (REQ-OSA-47, 48), and their NFRs.
- Modified: prerequisite (REQ-OSA-11: no longer requires `openspec`), wiring/idempotence (REQ-OSA-12, 13), pre-commit/CI (REQ-OSA-46, 49), developer-owned gates and TODO (REQ-OSA-55, 56), cleanup (REQ-OSA-57), action log (REQ-OSA-58), dependencies (NFR-OSA-1).
- CLI surface: `spec-rails check|verify|audit` removed (major version bump).

## Review Gate
- [x] **Gate 0 Decision**: Human decides Go (name the option) or No-Go before the proposal is drafted. -- Go: Option B (human), plus a clean path to upgrade the pinned OpenSpec
