# Stage 5 Review Report: Initial Zoom-Out Audit

* **Target Document:** [`docs/designs/multi-language-rails-anti-drift.md`](file:///Users/mmetawea/Workbench/spec-rails/docs/designs/multi-language-rails-anti-drift.md)
* **Predecessor:** [`concepts_brief.md`](file:///Users/mmetawea/Workbench/spec-rails/concepts_brief.md)
* **Auditor:** Skeptical Architect (Zoom Out Goldfish)
* **Verdict:** 🔴 **REVISE ARCHITECTURE (Blockers Identified)**

---

## High-Altitude Verdict

The proposed design suffers from **severe scope creep, architectural contradiction, and unnecessary complexity**.

Most critically, the pivot to a TypeScript/Node.js CLI directly violates Spec-Rails core principle `NFR-OSA-1` and reverses the explicit decision in [`concepts_brief.md:51-52`](file:///Users/mmetawea/Workbench/spec-rails/concepts_brief.md#L51-L52) ("*Rejected by author: Violates Spec-Rails core principle NFR-OSA-1 (zero new dependencies, pure POSIX sh + jq). Third-party Go and Rust adopters should not require Node.js runtimes*"). Imposing `node`, `npm`, and `npx` on Go, Rust, and Python codebases alienates the very developers Spec-Rails aims to onboard.

The underlying issues—symlink canonicalization and flexible test path discovery—can be resolved in ~15 lines of POSIX shell. The document also introduces speculative multi-language AST parsing and "markdown token verification theater."

---

## Detailed Findings

### 🔴 Blocker 1: Architectural Contradiction & Runtime Bloat (TypeScript/Node CLI Migration)
* **Severity:** 🔴 Blocker
* **Affected Scope:** Lines 30–36, 46–47, 70–116, 186–194, 214–235
* **Simplicity Rationale:**
  1. **Direct Contradiction:** [`concepts_brief.md:51-52`](file:///Users/mmetawea/Workbench/spec-rails/concepts_brief.md#L51-L52) explicitly rejected rewriting the installer/verifier in TypeScript/Node to preserve `NFR-OSA-1` (zero new dependencies, pure POSIX `sh` + `jq`). The design completely ignores this boundary without justification.
  2. **Ecosystem Mismatch:** Forcing Go and Rust developers to install Node 18+, maintain a `package.json`/`node_modules`, or run `npx spec-rails` in their CI pipelines creates a heavy barrier to entry. They chose Go/Rust specifically to avoid Node runtime footprints.
  3. **Disproportionate Solution:**
     - Symlink handling in [`bin/spec-rails:46-96`](file:///Users/mmetawea/Workbench/spec-rails/bin/spec-rails#L46-L96) requires replacing blanket symlink rejection with standard target canonicalization (`pwd -P` / `realpath`), a tiny POSIX shell change.
     - Flexible test path discovery (`testGlobs`) is a minor string/glob loop in [`bin/spec-rails-verify`](file:///Users/mmetawea/Workbench/spec-rails/bin/spec-rails-verify).
     - Swapping a 2MB `jq` dependency for a 50MB+ Node runtime and build pipeline (`tsup`, `zod`, `vitest`, `fast-glob`) is a massive regression in minimalism.
* **Recommendation:** Reject the TypeScript/Node rewrite. Keep Spec-Rails core as a zero-dependency POSIX shell installer and verifier (`bin/spec-rails`, `bin/spec-rails-verify`). Stack presets should remain pure static configurations and template files.

---

### 🔴 Blocker 2: Premature Over-Engineering (Multi-Language AST Contract Scaffolding Verifier)
* **Severity:** 🔴 Blocker
* **Affected Scope:** Lines 39, 88–89, 153–161, 225
* **Simplicity Rationale:**
  - The design proposes inspecting git diffs and parsing ASTs across four disparate languages (TypeScript, Python, Go, Rust) in Node to ensure function bodies only contain placeholder errors (`panic`, `throw`, `todo!()`).
  - Node has no native parsers for Go, Rust, or Python. Implementing this requires heavy external AST grammars (e.g. tree-sitter WASM) or brittle regex heuristics.
  - **YAGNI & Redundancy:** The Red-Green-Mutation rail *already* mechanically verifies the absence of production logic. If unit tests assert failures against empty signatures (Red) before implementation (Green), AST inspection adds zero new safety while introducing massive implementation maintenance liability.
* **Recommendation:** Cut `spec-rails scaffold-check` and AST parsing entirely. Rely on the existing Red rail protocol (committing a failing test first before production implementation).

---

### 🟡 Major 1: Verification Theater (Tokenized Evidence in `tasks.md`)
* **Severity:** 🟡 Major
* **Affected Scope:** Lines 40, 96–98, 146–152, 203–206, 270–273
* **Simplicity Rationale:**
  - Parsing `tasks.md` for arbitrary regex tokens (`Evidence: [CMD: ...] [EXIT: 0] [COVERAGE: 95%]`) does not prevent agent drift or hallucination. An agent can fabricate and write the exact bracketed string into Markdown without ever running tests.
  - Verification belongs strictly in deterministic execution harnesses (running the test runner in CI/pre-commit and inspecting actual process exit codes and machine-readable coverage reports). Gating on agent-authored prose in Markdown creates an illusion of rigor.
* **Recommendation:** Remove token parsing from `tasks.md`. Enforce verification strictly via execution exit codes and machine-readable output files (e.g., coverage XML/JSON and mutation score reports) during `bin/spec-rails-verify`.

---

### 🟡 Major 2: Spec Linter Duplication with OpenSpec (`spec-rails lint`)
* **Severity:** 🟡 Major
* **Affected Scope:** Lines 86–87, 115, 162–165, 226
* **Simplicity Rationale:**
  - The proposal invents a new command (`spec-rails lint --gate 1|2`) to validate `proposal.md` and `spec.md`.
  - OpenSpec already provides artifact validation schemas (`openspec validate`). Spec-Rails' architectural intent is to act as an OpenSpec addon schema (`schemas/spec-rails/`), not a competing validator CLI.
  - Pre-commit hooks already validate staged diffs. Adding custom lint commands reinvents OpenSpec's existing responsibilities.
* **Recommendation:** Leverage OpenSpec's native schema constraints (`schemas/spec-rails/`) and git pre-commit hooks instead of building bespoke linting commands.

---

### 🟢 Nit 1: Arbitrary Mutation Threshold Drift
* **Severity:** 🟢 Nit
* **Affected Scope:** Lines 20, 38, 50, 176–179
* **Simplicity Rationale:**
  - The design jumps to a rigid `>= 95%` mutation kill score across all tools, conflicting with the canonical `> 90%` threshold documented in [`README.md:18,44`](file:///Users/mmetawea/Workbench/spec-rails/README.md#L18-L44) and [`docs/DESIGN.md:44`](file:///Users/mmetawea/Workbench/spec-rails/docs/DESIGN.md#L44).
  - Ecosystem tools like `gremlins` (Go) and `mutmut` (Python) have coarse mutant generation on small diffs (e.g., 8/9 killed = 88.8%), which would spuriously fail valid PRs under an inflexible 95% threshold.
* **Recommendation:** Align mutation threshold back to the canonical `> 90%` or make it an explicit per-stack configurable threshold in `rails.conf`.

---

## Summary Action Plan for Author

1. **Drop the Node.js CLI Rewrite:** Retain POSIX `sh` for `bin/spec-rails` and `bin/spec-rails-verify`. Fix symlinks using `realpath` and allow space-separated/glob paths in `rails.conf`.
2. **Focus Exclusively on Presets:** Deliver the core value proposition: self-contained mutation configurations in `templates/mutation/{ts,python,go,rust}` and stack detection logic in `bin/spec-rails init`.
3. **Strip AST and Markdown Token Parsing:** Eliminate `scaffold-check` and token scraping in `tasks.md`. Keep verification focused on real command exit codes and mutation runner outputs.
