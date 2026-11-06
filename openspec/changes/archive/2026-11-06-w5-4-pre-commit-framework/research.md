# Research & Technical Tradeoffs

## 1. Intent & Ground Truth
Roadmap item W5.4:
- Pre-commit framework (`pre-commit`) is a hard prerequisite for Spec-Rails projects.
- `spec-rails init` must no longer write directly to `.git/hooks/pre-commit`. Direct file writing collides with the pre-commit framework, creating `.legacy` hooks and duplicate executions.
- `spec-rails init` ships `.pre-commit-config.yaml` containing:
  - Gate check: `npx spec-rails check`
  - Unresolved LGTM check
  - Branch protection hook
  - Stack-aware lint and test hooks tailored to the detected stack (e.g. `npm test` for `ts`, `pytest` for `python`, `go test` for `go`, `cargo test` for `rust`) rather than assuming `Makefile`.
- `spec-rails init` runs `pre-commit install` cleanly without leaving behind `.legacy` hooks or clobbering existing pre-commit configurations.

Existing constraints:
- In `src/commands/init.ts`, step 8 currently writes raw script to `.git/hooks/pre-commit`.
- `templates/.pre-commit-config.yaml` currently relies on `make lint` and `make test`. Adopters using modern stacks without a `Makefile` fail pre-commit hooks unless stack-specific commands are substituted.

## 2. Options Explored
**Option A: Standardize entirely on the pre-commit framework.**
- Eliminate manual hook writing in `init.ts`.
- Generate `.pre-commit-config.yaml` tailored to the detected stack.
- Execute `pre-commit install` from `init.ts` when git repository is present.
- Clean up any pre-existing colliding `.git/hooks/pre-commit.legacy` hooks.

**Option B: Dual-mode installer (raw git hook vs pre-commit framework).**
- Infer whether user wants pre-commit framework or raw git hooks.
- Rejected: Increases installer branch complexity, leads to unpredictable collisions, and violates standard Spec-Rails zero-bypass governance.

## 3. Tradeoff Matrix

| Criteria | Option A (Pre-commit framework standard) | Option B (Dual-mode) |
| :--- | :--- | :--- |
| **Complexity** | Low: unified pre-commit configuration | High: branching logic for git hooks vs framework |
| **Collision Risk** | Zero (framework manages `.git/hooks`) | High (recreates `.legacy` collisions) |
| **Stack Awareness** | High: generates `npm test`, `pytest`, `cargo test` | Low: Makefile-dependent |
| **Maintenance** | Single config generator | Dual hook installation paths |

## 4. Recommendation
Option A: Standardize exclusively on `.pre-commit-config.yaml` + `pre-commit install`. Tailor test hooks to the detected language stack.

## 5. Breaking Changes & Deprecations
- `spec-rails init` no longer writes a standalone `.git/hooks/pre-commit`.
- `pre-commit` CLI is required on PATH for hook installation during `init`.

## Review Gate
- [x] **Gate 0 Decision**: Go, Option A.
