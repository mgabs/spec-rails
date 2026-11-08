# Research & Technical Tradeoffs

## 1. Intent & Ground Truth
- **Problem**: `spec.md` template currently ends with a `## Review Gate` footer (Gate 2 Approval). When OpenSpec delta specs are archived to living specs (`openspec archive`), the review gate markup leaks into living specs and breaks pure OpenSpec schema separation. Furthermore, gating is inconsistent across documents: `WORKFLOW.md` and `SKILL.md` reference Gates 0–3 while `tasks.md` and `schema.yaml` reference Gates 4, 5.1, and separate `.feature` BDD pause gates.
- **Constraints**:
  - OpenSpec 1.16+ strict delta specs must contain only OpenSpec spec sections (`Purpose`, `ADDED Requirements`, `MODIFIED Requirements`, `REMOVED Requirements`, `RENAMED Requirements`).
  - Spec-Rails check (`spec-rails-check` / `src/commands/check.ts`) must enforce step-by-step human review pauses at Gates 0–3 without expecting or requiring a `## Review Gate` section in `spec.md`.
  - Gate 2 approval must be carried by `design.md` (covering specs + architecture before tasks are drafted).
  - Gate 3 approval must be carried by `tasks.md` (covering DAG and tasks before test/code execution).
  - Verification & Archival becomes Gate 4.

## 2. Options Explored

### Option A: Pure OpenSpec Delta Specs + Consolidated Gates 0–4 (Recommended)
- **Description**:
  1. Remove `## Review Gate` from `templates/spec.md` and `openspec/schemas/spec-rails/templates/spec.md`.
  2. In `check.ts`, remove `specs` as a gate checkpoint in `getGateNumber` and do not require `parseGateState` to find a `## Review Gate` in `spec.md`.
  3. Renumber `design.md` to Gate 2 (Architecture, Specs & Test Strategy) and `tasks.md` to Gate 3 (Tasks breakdown).
  4. Drop separate `.feature` tasks and Gate 5.x pauses from `schema.yaml` and `tasks.md`, adopting `Contract scaffolding → Red → Green → Coverage & Mutation`.
- **Pros**:
  - Delta specs remain 100% pure OpenSpec contracts with zero markdown gate pollution.
  - Aligns with OpenSpec archive semantics and `ROADMAP.md` W6.1 specification.
  - Eliminates gate numbering discrepancies across `WORKFLOW.md`, `SKILL.md`, `schema.yaml`, and `check.ts`.
- **Cons**:
  - Requires updating tests that mock or assert Gate 2 on `spec.md`.

### Option B: Keep Gate 2 in `spec.md` but Strip During `openspec archive`
- **Description**:
  Keep `## Review Gate` in `spec.md` for CLI check validation, but attempt to strip it out before or during `openspec archive`.
- **Pros**:
  - Preserves individual gate per planning file.
- **Cons**:
  - Fragile regex stripping; breaks OpenSpec living spec parity; contradicts pure OpenSpec design; adds technical debt.

## 3. Tradeoff Matrix

| Criteria | Option A (Pure Delta + Gates 0–4) | Option B (Strip on Archive) |
| :--- | :--- | :--- |
| **Complexity** | Low (clean schema and code simplification) | High (hooking/patching archive mechanics) |
| **New Dependencies** | None | None |
| **Performance & Latency** | Neutral | Neutral |
| **Maintenance Burden** | Low (single unified gate hierarchy) | High (custom spec parsing/stripping) |
| **Blast Radius** | Low (schema templates, check.ts, tests, docs) | High (risk of corrupted living specs) |

## 4. Recommendation
Adopt Option A. Remove `## Review Gate` from `spec.md` completely so delta specs stay pure OpenSpec contracts. Consolidate Gate 2 on `design.md` (specs + architecture approval) and Gate 3 on `tasks.md`.

## 5. Breaking Changes & Deprecations
- **REQ-OSA-4 Gate Footers**: Modified to mandate `## Review Gate` on `research.md`, `proposal.md`, `design.md`, and `tasks.md`, while explicitly prohibiting `## Review Gate` in `spec.md`.
- **REQ-OSA-6 Slice Loop**: Modified to remove separate `.feature` tasks and Gate 5.x pauses, standardizing on `Contract scaffolding → Red → Green → Coverage & Mutation`.

## Review Gate
- [x] **Gate 0 Decision**: Go (Option A) before the proposal is drafted.
