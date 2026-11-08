# Research & Technical Tradeoffs

## 1. Intent & Ground Truth

- **Problem**:
  1. AI agents often draft all planning artifacts (research through tasks) or implement code in a single unreviewed pass. `spec-rails check` must enforce step-by-step human review pauses: Gate 0 must be ticked before `proposal.md` exists, Gate 1 before `design.md`/`specs/`, Gate 2 before `tasks.md`, and Gate 3 before code diffs (`--audit`) or implementation tasks.
  2. Formatting failures (trailing whitespace, missing EOF newlines) in change artifacts fail late in git pre-commit or CI hooks rather than failing fast locally inside `npx spec-rails check`.
  3. Delta specs can introduce free-form requirement titles without structured IDs, breaking downstream traceability. Every requirement in delta `spec.md` must follow `(REQ|NFR)-<DOMAIN>-<N>`.
  4. `src/utils/evidence.ts` enforces rigid regex tokens (`[CMD: ...][EXIT: 0][COVERAGE: 95%][MUTATION: 95%]`). This is brittle and over-engineered; tasks should require only a free-text `Evidence: <note>` on ticked rail tasks.

- **Ground Truth Verified in Codebase**:
  - `src/commands/check.ts`: Currently inspects gate states, but lacks upstream blocking (allowing all artifacts to exist simultaneously unticked), whitespace/EOF validation, and requirement key verification.
  - `src/utils/evidence.ts`: `validateEvidenceToken` enforces `[CMD: ...]` and `[EXIT: 0]` in strict mode.
  - `openspec validate <change> --strict`: Supported natively by OpenSpec CLI to check schema compliance and artifact dependencies.

## 2. Options Explored

### Option A: Native TypeScript Validation Engine in `src/commands/check.ts` & `src/utils/evidence.ts` (Recommended)
- **Description**:
  - Implement step-by-step human review pause checks directly in `check.ts`: if downstream artifacts exist before the upstream gate is ticked, fail with an actionable gate violation.
  - Implement local whitespace and EOF newline checks on all change markdown files.
  - Run `openspec validate <change> --strict` via subprocess in `check.ts` and parse delta `spec.md` to ensure all requirements have `REQ-*` or `NFR-*` IDs.
  - Refactor `evidence.ts` so `validateEvidenceToken` requires `Evidence: <free-text>` with non-empty content on ticked rail tasks.
- **Pros**:
  - Zero external dependencies.
  - Fast execution (<50ms).
  - Consistent across all OS platforms (Node.js builtins).
- **Cons**:
  - Requires updating unit tests in `tests/unit/check.test.ts` and `tests/unit/evidence.test.ts`.

### Option B: Delegate Formatting and Validation to External CLI Wrappers
- **Description**:
  - Execute `pre-commit run trailing-whitespace` and `pre-commit run end-of-file-fixer` from inside `check.ts`.
- **Pros**:
  - Reuses existing python pre-commit configuration.
- **Cons**:
  - Heavy dependency on Python and `pre-commit` binary on `$PATH`.
  - Breaks environments where Python is not installed.
  - Slower execution.

### Option C: Standalone Lint Linter via Unified/Remark Markdown AST
- **Description**:
  - Add `remark` or `unified` AST parser dependencies to validate markdown syntax and headers.
- **Pros**:
  - Formal AST representation of markdown files.
- **Cons**:
  - Adds heavy third-party dependencies (`remark`, `unified`).
  - Violates ponytail YAGNI rule; string scanning / regex in TypeScript is sufficient and orders of magnitude faster.

## 3. Tradeoff Matrix

| Criteria | Option A (Native TS) | Option B (Pre-commit CLI) | Option C (Remark AST) |
| :--- | :--- | :--- | :--- |
| **Complexity** | Low | Medium | High |
| **New Dependencies** | None | Python / pre-commit | `remark`, `unified`, AST plugins |
| **Performance & Latency** | ~10ms | ~500ms (Python startup) | ~150ms |
| **Maintenance Burden** | Low | High (cross-platform PATH issues) | Medium |
| **Blast Radius** | Scoped to `check.ts` & `evidence.ts` | External environment coupling | `package.json` dependencies |

## 4. Recommendation

Adopt **Option A**: Implement native TypeScript gating, formatting hygiene, and requirement key verification in `src/commands/check.ts`, and simplify `src/utils/evidence.ts` to require a free-text `Evidence: <note>` on ticked rail tasks.

## 5. Breaking Changes & Deprecations

- **`REQ-OSA-25` (Gate Validation in spec-rails check)**: Modified to enforce step-by-step human review pauses (Gate 0 → Gate 1 → Gate 2 → Gate 3) before subsequent artifacts or code diffs are allowed, and to validate whitespace & EOF newline hygiene.
- **`REQ-OSA-47` (Evidence Token Format)**: Modified to simplify evidence requirements from structured `[CMD: ...][EXIT: 0]` tokens to free-text `Evidence: <note>`.

## Review Gate
- [x] **Gate 0 Decision**: Go (Option A - Native TypeScript validation engine).
