# Stage 7 Review Report: Goldfish Critic Review

* **Target:** `docs/designs/multi-language-rails-anti-drift.md` (lines 1..209)
* **Auditor:** EGM Multi-Lens Synthesizer (`egm-design`, `egm-structural`, `egm-style`)
* **Reviewers Status:**
  - `egm-design`: completed
  - `egm-structural`: completed
  - `egm-style`: completed

---

## Severity Summary
- 🔴 **Blocker**: 1
- 🟡 **Major**: 4
- 🟢 **Nit**: 3
- **Total Findings**: 8

---

## Prioritized Findings (Blockers -> Major -> Nits)

### Inversion of Core Principle `NFR-OSA-1` Without Reconciled Deprecation - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 31–35, 46, 186–194 (vs. `concepts_brief.md` lines 46, 51–53)
* **Discrepancy Description**: The predecessor brief (`concepts_brief.md`) explicitly set "Replacing OpenSpec CLI parser with a custom Node runtime" as an out-of-scope non-goal, and explicitly rejected a TypeScript/Node rewrite because it violates core principle `NFR-OSA-1` (zero new dependencies, pure POSIX `sh` + `jq`, avoiding imposing a Node.js runtime on Go/Rust developers). Section 2 and Section 6.1 invert this decision to mandate a TypeScript/Node core without documenting why `NFR-OSA-1` was waived or how pure Go/Rust CI environments run `npx spec-rails` without Node pre-installed.
* **Rationale & Recommendation**: Either provide a native standalone binary distribution (e.g. Node Single Executable Application or packaged binary) that runs without requiring host Node.js, or explicitly document the formal deprecation of `NFR-OSA-1` and record the architectural justification for adopting Node as a universal dependency across non-JS ecosystems.

---

### Multi-Language AST Scaffolding Feasibility in Zero-Dependency Bundle - Severity: 🟡 Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 39, 88–90, 153–160
* **Discrepancy Description**: Section 5.2.E asserts that `spec-rails scaffold-check` will parse ASTs or line tokens across TypeScript, Python, Go, and Rust to ensure initial slice commits contain zero executable statements, while Section 5.2.A specifies a bundled CLI with zero runtime dependencies. Parsing ASTs for four distinct syntaxes in a standalone Node binary is highly complex and error-prone. Falling back to heuristic line tokens or regex invites false positives/negatives on docstrings, multiline signatures, and comments.
* **Rationale & Recommendation**: Explicitly define the parsing engine mechanism (e.g. bundling WebAssembly Tree-sitter parsers vs delegating to stack-native toolchains like `python -m ast`, `go vet`, or `cargo check`). If AST checking is only provided for TypeScript with regex heuristics for other stacks, document that limitation clearly.

---

### Canonical Path Sandboxing Traversal Rejection on pnpm & Worktrees - Severity: 🟡 Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 15, 49, 82, 117–121
* **Discrepancy Description**: Section 5.2.B replaces symlink rejection with `fs.realpathSync` repository boundary validation. In pnpm repositories, virtual stores resolve outside the repository tree into global stores (`~/.local/share/pnpm/store`), and external Git worktrees resolve `.git` pointers to parent directories. Enforcing that `fs.realpathSync(target)` must strictly reside within repository boundaries will falsely block valid pnpm links and isolated git worktrees.
* **Rationale & Recommendation**: Refine the sandbox specification to differentiate between target project source paths and external dependency stores / git worktree metadata. Explicitly allowlist resolved symlink targets matching recognized package store paths.

---

### Agent Hallucination Vulnerability in Passive Tokenized Evidence - Severity: 🟡 Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 40, 96–98, 146–151, 203–206
* **Discrepancy Description**: Section 5.2.D and 6.4 argue that autonomous agents hallucinate free-form text, which is addressed by regex parsing `tasks.md` for bracketed evidence (`Evidence: [CMD: ...] [EXIT: 0] [COVERAGE: 95%] [MUTATION: 95%]`). However, because `tasks.md` is edited directly by the agent, the agent can hallucinate the bracketed tokens without running tests or mutations.
* **Rationale & Recommendation**: Specify that `spec-rails verify` directly executes the test and mutation commands as subprocesses and mechanically writes a tamper-evident execution receipt or status stamp, rather than passively trusting agent-authored strings in `tasks.md`.

---

### Strict Mode CI Execution Blocks Non-Code Slices - Severity: 🟡 Major
* **Reviewer Lens:** `egm-design`
* **Affected Scope:** Lines 50–51, 144–145, 172
* **Discrepancy Description**: Under strict verification (`strict: true`), any unconfigured or zero-kill mutation run is rejected. OpenSpec slices frequently touch only markdown specifications, docs, or configuration files where mutation runners cannot execute. Without changeset inspection, strict mode will fail valid doc/spec slices.
* **Rationale & Recommendation**: Specify that `spec-rails verify` first checks whether any source files matching `testGlobs` or source boundaries were modified in the slice diff. If zero source files were modified, allow the mutation rail to cleanly skip or pass with an informational notice.

---

### Lettered H4 Heading Hierarchy in Component Breakdown - Severity: 🟡 Major
* **Reviewer Lens:** `egm-structural`
* **Affected Scope:** Lines 106–165 (Section 5.2)
* **Discrepancy Description**: Section 5.2 introduces lettered H4 headings (`#### A. Core CLI Package`, `#### B. Canonical Path Sandboxing`, etc.). This deviates from the numbered outline standard used throughout the rest of the document (e.g. `### 5.1`, `### 5.2`, `### 5.3`, `### 6.1`).
* **Rationale & Recommendation**: Standardize Section 5.2 to numeric outline headings (`#### 5.2.1 Core CLI Package`, `#### 5.2.2 Canonical Path Sandboxing`, etc.) or un-lettered semantic H4 headings to ensure consistent document hierarchy.

---

### Inconsistent Inline Math Notation (`$\ge 95\%$` vs `>= 95%`) - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-structural`
* **Affected Scope:** Lines 38, 50, 130, 134, 138, 151, 178
* **Discrepancy Description**: Lines 130, 134, and 138 use LaTeX math notation `$\ge 95\%$`, whereas lines 38, 50, 63, 149, 151, and 178 use standard plain text `>= 95%`. LaTeX math delimiters are not uniformly rendered across markdown viewers and introduce visual inconsistency.
* **Rationale & Recommendation**: Standardize on plain text `>= 95%` throughout the document.

---

### Contradictory Document Status and Title - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Lines 1, 3
* **Discrepancy Description**: Line 1 labels the document `# Design Draft: Multi-Language Rails & Anti-Drift Engine`, while line 3 records `* **Status:** Finalized`. A document cannot be both a draft and finalized simultaneously.
* **Rationale & Recommendation**: Harmonize the status. If the document is still under critic review, set `* **Status:** Draft`. If finalized, change the title to `# Design: Multi-Language Rails & Anti-Drift Engine`.

---

### Ambiguous Fast-Glob Configuration Defaults Phrasing - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** Lines 142–143
* **Discrepancy Description**: Line 143 states: "Evaluates fast-glob matching based on stack defaults (e.g. `src/**/*.test.ts`, `*_test.go`, `tests/**`)." It is ambiguous whether these defaults are dynamically applied at runtime or populated into `spec-rails.config.json` during `spec-rails init`.
* **Rationale & Recommendation**: Clarify that `spec-rails init` writes default stack globs to `spec-rails.config.json`, with the CLI falling back to internal defaults only if the key is missing.
