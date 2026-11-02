# Research & Technical Tradeoffs

## 1. Intent & Ground Truth
Goal: clearer folder layout, fewer duplicates, one obvious home per artifact.

Verified in the repo:
- `specs/` holds `WORKFLOW.md`, `ROADMAP.md` and (by convention) `bug-reports/`. It is referenced by `rules/AGENTS.md`, `skills/spec-rails/SKILL.md`, `README.md`, `docs/`, `templates/roadmap.md`, `templates/spec-rails-ci.yml`, `.github/workflows/spec-rails-ci.yml`, `tests/bdd/` and `openspec/specs/openspec-addon/spec.md` (REQ-OSA-5/19/20/21).
- `WORKFLOW.md` is addon protocol text identical for every adopter, but the installer never ships it. Adopter `AGENTS.md` still says "in a repository containing `specs/WORKFLOW.md`", so adopters are pointed at a file they do not have.
- `ROADMAP.md` and `bug-reports/` are per-project data. Upstream OpenSpec (Fission-AI) has no equivalent; its layout is `openspec/{specs,changes,changes/archive}`.
- `docs/ROADMAP.md` already exists as a design note, colliding with the delivery-status roadmap name.
- REQ-OSA-22 and `tests/test_selfcopy.sh` require `openspec/spec-rails/` to be byte-identical to its sources.

## 2. Options Explored
- **A. Keep `specs/`**: no change. Adopters keep a dangling WORKFLOW.md reference; repo keeps a folder upstream does not know.
- **B. Ship protocol, move data to `docs/`**: `WORKFLOW.md` becomes `openspec/spec-rails/WORKFLOW.md` (source `rules/WORKFLOW.md`, installed with `AGENTS.md`); delivery status becomes `docs/ROADMAP.md`; bug reports go to `docs/bug-reports/`; the design note becomes `docs/DESIGN.md`; `specs/` is removed.
- **C. Option B plus de-duplicating self-copies**: make `openspec/` the only copy and have the installer read from it. Larger rewrite of installer and tests.

## 3. Tradeoff Matrix

| Criteria | A | B | C |
| :--- | :--- | :--- | :--- |
| **Complexity** | none | medium (path renames, one new shipped file) | high |
| **New Dependencies** | none | none | none |
| **Performance & Latency** | n/a | n/a | n/a |
| **Maintenance Burden** | dangling reference stays | one fewer top-level folder; protocol versioned with addon | lowest long-term |
| **Blast Radius** | none | ~20 files, 5 requirements, CI template | adds installer and selfcopy test rewrite |

## 4. Recommendation
Option B. It fixes the dangling reference and aligns with upstream layout; defer C, since REQ-OSA-22 is a deliberate guard.

## 5. Breaking Changes & Deprecations
- REQ-OSA-5 (Gate Instructions): `WORKFLOW.md` path reference updated.
- REQ-OSA-19 (Delta Rebase Discipline): location of `WORKFLOW.md` updated.
- REQ-OSA-20 (Self-Migration): `specs/` no longer exists at all.
- REQ-OSA-21 (CI Audit Layout): `specs/bug-reports/` becomes `docs/bug-reports/`.
- REQ-OSA-22 (Self-Copy Sync): `rules/WORKFLOW.md` added to the synced sources.
- Adopters with an existing `specs/bug-reports/` or `specs/ROADMAP.md` must move them; the new CI audit no longer treats `specs/bug-reports/` as spec-backing.

## Review Gate
- [x] **Gate 0 Decision**: Go, Option B (ship protocol, move data to `docs/`).
