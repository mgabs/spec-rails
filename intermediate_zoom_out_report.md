# Step 8 Review Report: Intermediate Zoom-Out Audit

* **Target Document:** [`docs/designs/multi-language-rails-anti-drift.md`](file:///Users/mmetawea/Workbench/spec-rails/docs/designs/multi-language-rails-anti-drift.md)
* **Predecessor Context:** [`concepts_brief.md`](file:///Users/mmetawea/Workbench/spec-rails/concepts_brief.md)
* **Context Reports Evaluated:**
  - [`zoom_out_report.md`](file:///Users/mmetawea/Workbench/spec-rails/zoom_out_report.md)
  - [`comprehension_report.md`](file:///Users/mmetawea/Workbench/spec-rails/comprehension_report.md)
  - [`critic_report.md`](file:///Users/mmetawea/Workbench/spec-rails/critic_report.md)
* **Auditor:** Skeptical Architect (Zoom Out Goldfish)
* **Verdict:** 🔴 **REVISE ARCHITECTURE (Blockers Identified)**

---

## High-Altitude Verdict

Design suffers from extreme over-engineering, YAGNI violations, and direct contradiction of predecessor constraints.

1. **Node Rewrite Contradiction**: Inverting core principle `NFR-OSA-1` to rewrite the CLI in TypeScript/Node directly reverses explicit author decision in [`concepts_brief.md:46, 51-52`](file:///Users/mmetawea/Workbench/spec-rails/concepts_brief.md#L46-L52). Resolving symlink traversal and flexible test globs requires ~10 lines of POSIX shell (`pwd -P` / `realpath`), not a 50MB Node runtime and npm build harness foisted upon Go, Rust, and Python codebases.
2. **Scaffold AST Verifier Bloat**: Building multi-language AST inspection into a zero-dependency CLI is an architectural dead-end. The existing Red-Green test rail already guarantees contracts are unfulfilled before implementation; AST diff inspection is redundant YAGNI complexity.
3. **Passive Token Verification Theater**: Scraping regex tokens out of agent-authored `tasks.md` does zero mechanical drift prevention. Agents can hallucinate bracketed strings as easily as narrative prose. Mechanical verification belongs strictly in subprocess execution and machine-readable output verification.

---

## Detailed Findings

### 🔴 Blocker 1: Inversion of Core Principle `NFR-OSA-1` via Node CLI Rewrite
* **Severity:** 🔴 Blocker
* **Affected Scope:** Lines 30–36, 46–47, 70–102, 106–116, 186–194, 214–235
* **Simplicity Rationale:**
  - **Direct Contradiction:** [`concepts_brief.md:46, 51-52`](file:///Users/mmetawea/Workbench/spec-rails/concepts_brief.md#L46-L52) explicitly rejected replacing POSIX shell with Node to uphold `NFR-OSA-1` (zero new dependencies, pure POSIX `sh` + `jq`). The design ignores this constraint without architectural justification.
  - **Severe Over-Engineering:** Blanket symlink rejection in [`bin/spec-rails:46-96`](file:///Users/mmetawea/Workbench/spec-rails/bin/spec-rails#L46-L96) is fixed by canonical target resolution (`realpath` or `pwd -P`). Test discovery globs are handled by a shell loop. Replacing 20 lines of shell with Node 18+, `tsup`, `zod`, `vitest`, and `fast-glob` introduces massive runtime bloat and alienates Go, Rust, and Python developers.
* **Recommendation:** Strip the Node rewrite. Maintain POSIX `sh` in `bin/spec-rails` and `bin/spec-rails-verify`. Deliver language presets as pure configuration templates in `schemas/spec-rails/presets/`.

---

### 🔴 Blocker 2: Multi-Language AST Scaffolding Inspector (`scaffold-check`)
* **Severity:** 🔴 Blocker
* **Affected Scope:** Lines 39, 88–90, 114, 153–161, 225, 249
* **Simplicity Rationale:**
  - **Technically Unsound & Infeasible:** The plan claims to parse ASTs across TypeScript, Python, Go, and Rust within a zero-dependency bundle (`package.json` in line 216 has no AST parsers or tree-sitter bindings). Regex fallback produces frequent false positives and negatives across multiline signatures, comments, and docstrings.
  - **Pure YAGNI & Redundant:** The core Red-Green contract already mechanically enforces empty implementations. If test slice commit #1 introduces failing tests against empty stubs (Red rail), AST inspection provides zero additional verification value at massive maintenance cost.
* **Recommendation:** Eliminate `spec-rails scaffold-check` and AST parsing entirely. Enforce contract gating through standard Red test rail verification.

---

### 🟡 Major 1: Verification Theater via Passive Markdown Token Scraping
* **Severity:** 🟡 Major
* **Affected Scope:** Lines 25, 40, 96–98, 146–152, 203–206, 270–273
* **Simplicity Rationale:**
  - **Hallucination Vector Unresolved:** Section 6.4 claims bracketed tokens (`Evidence: [CMD: ...] [EXIT: 0] [MUTATION: 95%]`) eliminate agent hallucination. However, because agents author `tasks.md`, an LLM can hallucinate the exact bracketed string without executing the commands.
  - **Wrong Verification Boundary:** Real mechanical rails execute test and mutation commands as subprocesses during `bin/spec-rails-verify`, directly inspecting exit codes and machine output (e.g. coverage XML/JSON, mutation runner output). Trusting agent-edited markdown tokens is verification theater.
* **Recommendation:** Remove token parsing from `tasks.md`. Enforce verification strictly via subprocess execution and machine-readable output evaluation in `bin/spec-rails-verify`.

---

### 🟡 Major 2: Spec Linter Duplication with OpenSpec (`spec-rails lint`)
* **Severity:** 🟡 Major
* **Affected Scope:** Lines 86–87, 115, 162–165, 226, 250
* **Simplicity Rationale:**
  - Spec-Rails is an OpenSpec addon schema. OpenSpec already provides schema validation (`openspec validate`).
  - Inventing a custom markdown linter inside `spec-rails` duplicates OpenSpec tooling and adds unnecessary code surface area. Pre-commit hooks can check forbidden dependencies via git diff directly.
* **Recommendation:** Drop `spec-rails lint`. Rely on OpenSpec schemas and standard git diff pre-commit hooks.

---

### 🟡 Major 3: Strict Mode Blocks Non-Code Changesets
* **Severity:** 🟡 Major
* **Affected Scope:** Lines 20, 50–51, 144–145, 172
* **Simplicity Rationale:**
  - Requiring non-zero mutation kill scores unconditionally under `strict: true` breaks documentation-only, schema-only, or specification-only slices where zero production code files are modified.
* **Recommendation:** Add changeset inspection. If diff contains no source files matching `testGlobs`, cleanly skip mutation testing with an informational pass.

---

### 🟢 Nit 1: Mutation Threshold Officially Updated to >= 95% (Resolved by Author)
* **Severity:** 🟢 Nit (Resolved)
* **Affected Scope:** Lines 38, 50, 130, 134, 138, 178
* **Resolution**: Author confirmed calibrating mutation kill rail to `>= 95%` across all stacks, accompanied by an explicit OpenSpec delta spec modifying `NFR-OSA-5` (`MODIFIED NFR-OSA-5`). Updated in living spec migration plan.

---

### 🟢 Nit 2: Document Status Contradiction
* **Severity:** 🟢 Nit
* **Affected Scope:** Lines 1, 3
* **Simplicity Rationale:**
  - Line 1 labels document "Design Draft", Line 3 records "Status: Finalized".
* **Recommendation:** Set `Status: Draft` until review cycle completes.

---

## Action Plan for Author

1. **Drop Node CLI Rewrite:** Retain POSIX `sh` for `bin/spec-rails` and `bin/spec-rails-verify`. Fix symlinks via `realpath` and add flexible `testGlobs` discovery in shell.
2. **Deliver Pure Static Presets:** Focus on turnkey mutation presets (`schemas/spec-rails/presets/{ts,python,go,rust}`) and manifest auto-detection in `bin/spec-rails init`.
3. **Eliminate AST Scaffolding & Markdown Scraping:** Drop `scaffold-check` and token scraping in `tasks.md`. Enforce all rails via deterministic subprocess execution in `bin/spec-rails-verify`.
