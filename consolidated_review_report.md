# Consolidated Goldfish Review Report

* **Target Document:** [`docs/designs/multi-language-rails-anti-drift.md`](file:///Users/mmetawea/Workbench/spec-rails/docs/designs/multi-language-rails-anti-drift.md)
* **Predecessor Context:** [`concepts_brief.md`](file:///Users/mmetawea/Workbench/spec-rails/concepts_brief.md)
* **Date:** 2026-11-03
* **Synthesized Across 5 Stages:**
  - Stage 5: Initial Zoom-Out Review ([`zoom_out_report.md`](file:///Users/mmetawea/Workbench/spec-rails/zoom_out_report.md))
  - Stage 6: Comprehension Test ([`comprehension_report.md`](file:///Users/mmetawea/Workbench/spec-rails/comprehension_report.md))
  - Stage 7: Critic Review ([`critic_report.md`](file:///Users/mmetawea/Workbench/spec-rails/critic_report.md))
  - Stage 8: Intermediate Zoom-Out Review ([`intermediate_zoom_out_report.md`](file:///Users/mmetawea/Workbench/spec-rails/intermediate_zoom_out_report.md))
  - Stage 9: Implementation Readiness Test ([`implementation_readiness_report.md`](file:///Users/mmetawea/Workbench/spec-rails/implementation_readiness_report.md))

---

## Executive Summary

The multi-lens swarm completed a comprehensive audit of the proposed **Multi-Language Rails & Anti-Drift Engine** design. 

The review identifies three systemic blockers:
1. **Architectural Contradiction of Core Invariant `NFR-OSA-1`**: The decision to pivot the CLI to TypeScript/Node.js directly contradicts `concepts_brief.md` and living spec `NFR-OSA-1` (zero new dependencies, pure POSIX `sh` + `jq`). Forcing a Node runtime on Go, Rust, and Python repositories defeats the core mission of turnkey onboarding.
2. **Technically Infeasible AST Scaffold Parsing**: Requiring a zero-dependency CLI to parse ASTs across four disparate languages (TypeScript, Python, Go, Rust) is an architectural dead-end. The existing Red test rail already mechanically verifies that tests fail against empty contracts before code is written.
3. **Passive Token Verification Theater**: Regex scraping of `tasks.md` does not prevent agentic hallucination, as agents can write fake bracketed tokens without running tests. True verification requires subprocess execution and machine-readable output verification in `bin/spec-rails-verify`.

---

## Consolidated Action Items

### 🔴 Blockers (Immediate Remediation Required)

#### [BLK-01] Reconcile Node.js Pivot vs. POSIX `NFR-OSA-1` Boundary
* **Origin:** Stage 5, Stage 7, Stage 8, Stage 9
* **Issue:** `docs/designs/multi-language-rails-anti-drift.md` mandates a Node.js CLI runtime (`package.json`, `dist/cli.js`), which breaches `NFR-OSA-1` and inverts `concepts_brief.md:51-52`. Forcing Node on Go/Rust codebases creates adoption friction. The root causes (symlink handling and flexible test globs) can be resolved in ~15 lines of POSIX shell using `realpath` and shell loops.
* **Remediation Options:**
  - *Option A (Recommended)*: Retain POSIX `sh` in `bin/spec-rails` and `bin/spec-rails-verify`. Implement canonical target resolution (`realpath` / `pwd -P`) and glob looping in shell. Deliver language presets as pure configuration templates in `templates/presets/`.
  - *Option B (If Node is strictly desired)*: Author an explicit OpenSpec delta spec modifying `NFR-OSA-1` to permit Node >= 18 runtimes, and package the CLI as a standalone zero-dependency single-executable binary so non-Node environments are not forced to manage `node_modules`.

#### [BLK-02] Cut AST Scaffolding Inspector in Favor of Red Test Rail
* **Origin:** Stage 5, Stage 6, Stage 7, Stage 8, Stage 9
* **Issue:** Section 5.2.E and 7.1 specify `src/commands/scaffold.ts` parsing ASTs across TS, Python, Go, and Rust within a zero-dependency bundle. Node has no native parsers for Go, Rust, or Python. Heuristic regex line matching will produce false positives on multiline signatures, docstrings, and comments. Furthermore, the Red test rail already mechanically proves that production logic is unfulfilled.
* **Remediation:** Remove `spec-rails scaffold-check` and multi-language AST parsing from the design. Rely strictly on the existing Red rail protocol (Slice Commit #1 commits a failing unit test against placeholder contracts).

---

### 🟡 Majors (High Priority Structural & Functional Fixes)

#### [MAJ-01] Replace Passive Markdown Token Scraping with Deterministic Subprocess Execution
* **Origin:** Stage 6, Stage 7, Stage 8, Stage 9
* **Issue:** Agents author `tasks.md`, so agents can hallucinate `Evidence: [CMD: ...] [EXIT: 0] [COVERAGE: 95%] [MUTATION: 95%]` without executing commands. Passive regex scraping provides an illusion of safety.
* **Remediation:** Specify that `bin/spec-rails-verify` directly executes `testCommand` and `mutationCommand` as subprocesses, directly parses process exit codes and machine-readable report artifacts (e.g., LCOV coverage, Stryker/mutmut JSON/XML), and automatically stamps execution verification into `tasks.md`.

#### [MAJ-02] Eliminate Spec Linter Duplication with OpenSpec (`spec-rails lint`)
* **Origin:** Stage 5, Stage 8
* **Issue:** Inventing `spec-rails lint` duplicates OpenSpec's native `openspec validate` command and git pre-commit hooks.
* **Remediation:** Drop `spec-rails lint`. Enforce YAGNI forbidden dependencies via standard pre-commit git diff hooks, and enforce Gherkin scenarios via OpenSpec schema rules (`openspec/schemas/spec-rails/`).

#### [MAJ-03] Align Preset Paths with OpenSpec Repository Structure
* **Origin:** Stage 9
* **Issue:** Section 7 places presets in root `schemas/spec-rails/presets/`. OpenSpec convention stores schemas in `openspec/schemas/spec-rails/` and templates in `templates/` / `openspec/spec-rails/mutation/`.
* **Remediation:** Update file paths to `templates/presets/{ts,python,go,rust}/` or `openspec/schemas/spec-rails/presets/` to maintain seamless compatibility with `openspec schemas` and installer scripts.

#### [MAJ-04] Add Changeset Source Inspection to Strict Mode
* **Origin:** Stage 7, Stage 8
* **Issue:** In CI under `strict: true`, requiring mutation runs unconditionally will fail documentation-only, schema-only, or specification-only slices where zero production code files are modified.
* **Remediation:** Update `spec-rails verify` to check git diff for modified files matching source/test patterns. If zero source files are modified, cleanly skip mutation testing with an informational pass.

#### [MAJ-05] Fix pnpm Virtual Store and Git Worktree Canonical Boundary Checks
* **Origin:** Stage 7
* **Issue:** Rejecting symlinks whose target falls outside the repository root will falsely reject pnpm virtual stores (`~/.local/share/pnpm/store`) and external Git worktrees (`.git` pointers).
* **Remediation:** Differentiate project source targets from external package stores and git metadata. Explicitly allowlist external store paths during canonical resolution.

---

### 🟢 Nits (Polish & Consistency)

#### [NIT-01] Harmonize Title and Document Status
* **Origin:** Stage 7, Stage 8
* **Issue:** Document title says `Design Draft`, while line 3 says `Status: Finalized`.
* **Remediation:** Set `Status: Draft` until reviews are reconciled and approved.

#### [NIT-02] Mutation Threshold Formally Updated to >= 95% (`MODIFIED NFR-OSA-5`)
* **Origin:** Stage 5, Stage 8, Stage 9
* **Status:** Resolved by Author
* **Resolution:** Author explicitly calibrated the project mutation kill threshold to `>= 95%`. Added `MODIFIED NFR-OSA-5` to the OpenSpec delta migration plan to formally synchronize living spec `openspec/specs/openspec-addon/spec.md`, rules, and templates to `>= 95%`.

#### [NIT-03] Format Consistency (LaTeX vs Plain Text)
* **Origin:** Stage 7
* **Issue:** Inconsistent mixture of `$\ge 95\%$` and `>= 95%`.
* **Remediation:** Standardize on plain text `>= 95%` throughout.

---

## Traceability Matrix

| Raw Finding ID / Topic | Stage | Source Lens | Consolidated Action Item |
| :--- | :--- | :--- | :--- |
| TypeScript/Node Rewrite Contradiction | Stage 5 | `egm-zoom-out` | **[BLK-01]** |
| Inversion of Core Principle `NFR-OSA-1` | Stage 7 | `egm-design` | **[BLK-01]** |
| Inversion of `NFR-OSA-1` via Node CLI | Stage 8 | `egm-zoom-out` | **[BLK-01]** |
| Architectural Contradiction & Spec Breach | Stage 9 | `egm-codebase-details` | **[BLK-01]** |
| Premature Over-Engineering (AST Scaffold) | Stage 5 | `egm-zoom-out` | **[BLK-02]** |
| Multi-Language AST Parsing Feasibility | Stage 6 | `egm-comprehension` | **[BLK-02]** |
| Multi-Language AST Scaffolding Feasibility | Stage 7 | `egm-design` | **[BLK-02]** |
| Multi-Language AST Scaffolding Inspector | Stage 8 | `egm-zoom-out` | **[BLK-02]** |
| Contract Scaffolding AST Parsing Algorithm | Stage 9 | `egm-implementation-readiness` | **[BLK-02]** |
| Evidence Verification Hallucination Vector | Stage 6 | `egm-comprehension` | **[MAJ-01]** |
| Agent Hallucination in Passive Evidence | Stage 7 | `egm-design` | **[MAJ-01]** |
| Verification Theater via Markdown Tokens | Stage 8 | `egm-zoom-out` | **[MAJ-01]** |
| Evidence Token Regex Grammar & Escaping | Stage 9 | `egm-implementation-readiness` | **[MAJ-01]** |
| Spec Linter Duplication with OpenSpec | Stage 5 | `egm-zoom-out` | **[MAJ-02]** |
| Spec Linter Duplication (`spec-rails lint`) | Stage 8 | `egm-zoom-out` | **[MAJ-02]** |
| Undefined External Systems / Gate Layout | Stage 6 | `egm-comprehension` | **[MAJ-02]** |
| Preset & Schema Directory Path Misalignment | Stage 9 | `egm-codebase-details` | **[MAJ-03]** |
| Lifecycle of `bin/spec-rails-verify` in CI | Stage 9 | `egm-codebase-details` | **[MAJ-03]** |
| Strict Mode Blocks Non-Code Slices | Stage 7 | `egm-design` | **[MAJ-04]** |
| Strict Mode Blocks Non-Code Changesets | Stage 8 | `egm-zoom-out` | **[MAJ-04]** |
| Canonical Path Traversal Rejection on pnpm | Stage 7 | `egm-design` | **[MAJ-05]** |
| Arbitrary Mutation Threshold Drift | Stage 5 | `egm-zoom-out` | **[NIT-02]** |
| Mutation Threshold Inconsistency | Stage 9 | `egm-style` | **[NIT-02]** |
| Inconsistent Inline Math Notation | Stage 7 | `egm-structural` | **[NIT-03]** |
| Lettered H4 Heading Hierarchy | Stage 7 | `egm-structural` | **[NIT-03]** |
| Document Title & Status Contradiction | Stage 7 | `egm-style` | **[NIT-01]** |
| Status Contradiction (Draft vs Finalized) | Stage 8 | `egm-zoom-out` | **[NIT-01]** |

---

## Recommended Next Steps

1. **Resolve BLK-01 (Architecture Pivot)**:
   - Determine whether to revert to zero-dependency POSIX `sh` (aligning with `NFR-OSA-1`) or formally specify an OpenSpec delta spec modifying `NFR-OSA-1` for Node.
2. **Resolve BLK-02 & MAJ-01 (Anti-Drift Realism)**:
   - Cut speculative AST parsing.
   - Upgrade `bin/spec-rails-verify` to execute test/mutation subprocesses directly and write tamper-evident execution receipts.
3. **Reconcile `docs/designs/multi-language-rails-anti-drift.md`**:
   - Apply fixes and advance to implementation planning under OpenSpec.
