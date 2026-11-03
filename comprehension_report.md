# Stage 6: Comprehension Test Report

Target: `docs/designs/multi-language-rails-anti-drift.md`
FeatureRange: Lines 1..209
DetailedRange: Lines 210..273

### High-Level Architectural Paraphrase

**What this proposes**:
The design modernizes Spec-Rails from a POSIX shell script relying on external `jq` into a standalone, zero-runtime-dependency TypeScript/Node CLI (`spec-rails` / `@openspec/spec-rails`). It delivers cross-platform operation across Linux, macOS, and Windows with canonical path sandboxing (`fs.realpathSync`) to resolve symlink breakages in monorepos and pnpm virtual stores. It provides automated multi-stack initialization (`ts`, `python`, `go`, `rust`) with pre-calibrated mutation test presets (Stryker, mutmut, gremlins, cargo-mutants) enforcing $\ge 95\%$ test coverage and mutation kill thresholds. To eliminate agentic drift, it introduces mechanical gating: YAGNI diff linting, Gherkin scenario validation, slice contract scaffolding verification, and structured tokenized evidence parsing.

**How the existing system works, per this document**:
The existing Spec-Rails implementation relies on POSIX shell scripts (`bin/spec-rails` and `bin/spec-rails-verify`) that depend on the external system binary `jq`. It rejects all symlinks outright, breaking execution in macOS `/var` paths and monorepo/pnpm environments. Its tooling and test discovery assume Python `Makefile` structures and a hardcoded `"tests"` folder, failing on Go, Rust, and TypeScript conventions. Unconfigured mutation and coverage rails default to warning and exiting with code 0 instead of failing. Slice verification currently accepts free-form Markdown text as verification proof, enabling autonomous agents to hallucinate passing test outputs.

---

### Detailed Execution Paraphrase

The execution plan implements a standalone Node CLI distributed via npm/npx using `tsup`, `vitest`, `zod`, and `fast-glob`, without runtime dependencies. Implementation is structured into five sequential phases:
1. Core CLI bootstrap, Zod configuration validation (`spec-rails.config.json`), and canonical realpath sandboxing.
2. Manifest auto-detection (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`) and preset file generation for TypeScript, Python, Go, and Rust.
3. Anti-drift mechanical rails: initial slice commit scaffold checking (verifying empty signatures) and Gate 1/Gate 2 markdown linting.
4. Test and mutation verification runner (`testGlobs`, strict enforcement, and regex parsing of bracketed evidence in `tasks.md`).
5. Self-hosting dogfooding pass validating the $\ge 95\%$ mutation score on itself, followed by documentation updates.

Each slice must satisfy five gates: Red test scaffolding, contract scaffold verification, passing green implementation, $\ge 95\%$ coverage and mutation kill scores, and tokenized evidence recorded in `tasks.md`.

---

### Findings: Readability, Undefined Terms, and Comprehension Gaps

#### 1. 🟡 Major: Evidence Verification vs. Hallucination Vector Ambiguity
* **Affected Scope**: Lines 24–25, 40, 96–99, 146–151, 203–206, 222, 224, 270–273
* **Discrepancy Description & Rationale**:
  The document states that unstructured narrative evidence allows AI agents to fabricate test output (Line 25), and proposes structured tokens (`Evidence: [CMD: ...] [EXIT: 0] [COVERAGE: 95%] [MUTATION: 95%]`) as the mechanical fix (Lines 40, 204–206). However, the document does not specify *who* writes this token into `tasks.md` or *how* `spec-rails verify` validates authenticity:
  - If the AI agent writes the line into `tasks.md`, what prevents an agent from hallucinating or forging the exact token string without running the tools?
  - If `spec-rails verify` executes the commands (Lines 94–95, 224), does `verify` write the token into `tasks.md` automatically, or does it compare `tasks.md` against actual process execution logs?
  This creates a critical comprehension gap in the core anti-drift mechanism.

#### 2. 🟡 Major: Undefined External Systems and Missing Gate Definitions
* **Affected Scope**: Lines 12, 53–56, 86–90, 163–165, 226
* **Discrepancy Description & Rationale**:
  - **`mgabs/lgtm`** (Line 12): Referenced with zero definition, explanation, or documentation link. A new reader cannot determine its role in the architecture.
  - **`OpenSpec`** (Lines 12, 31): Referenced as an ecosystem standard and package scope (`@openspec/spec-rails`), but its artifact layout and lifecycle are never defined or linked.
  - **`Gates 0–6`** (Line 12): The document references "Gates 0–6", and mentions Gate 1, Gate 2, Gate 3, and Gate 4 in subsequent sections, but Gates 0, 5, and 6 are never defined anywhere in the document.
  - **`proposal.md`, `spec.md`, and `tasks.md`** (Lines 53–56, 147, 163–164, 226): Stated to be inputs to `spec-rails lint` and `spec-rails verify`, but their file paths, directory structure, and formats (e.g. how `proposal.md` specifies "forbidden packages" for Gate 1 linting) are undefined.

#### 3. 🟡 Major: Multi-Language AST Parsing Feasibility vs. Declared Dependencies
* **Affected Scope**: Lines 153–161, 192, 216, 225, 249
* **Discrepancy Description & Rationale**:
  Line 154 states that `scaffold.ts` "Parses AST or line tokens" across TypeScript, Python, Go, and Rust to verify function bodies only contain placeholder errors (`throw`, `raise`, `panic`, `todo!`). Line 192 specifically rejects shell scripts due to an "Inability to perform robust AST parsing". However, the declared dependencies in `package.json` (Line 216) include only `tsup`, `vitest`, `zod`, and `fast-glob`—with no AST parsing libraries (e.g. Tree-sitter, Babel, or language parsers). Falling back to regex / line tokens contradicts the architectural rationale in Line 192 and is prone to false positives/negatives across four distinct programming languages.

#### 4. 🟡 Major: Unspecified Resolution for "Slice Commit #1"
* **Affected Scope**: Lines 55, 88, 114, 154, 225, 249
* **Discrepancy Description & Rationale**:
  The scaffold check verifies that "Slice commit #1 contains zero executable statements" (Line 55). The CLI interface exposes `spec-rails scaffold-check [--commit <sha>]` (Line 114). The document never explains how `spec-rails` determines which commit is "Slice commit #1" when the optional `--commit` flag is omitted (e.g., inspecting git worktree base, git merge-base against `main`, or reading a state file).

#### 5. 🟢 Nit: Native Windows Execution vs. POSIX Trampoline
* **Affected Scope**: Lines 47, 108–110, 216, 232
* **Discrepancy Description & Rationale**:
  Goal 47 guarantees "Native support for Linux, macOS, and Windows without POSIX shell emulation layers." However, Line 232 specifies replacing `bin/spec-rails` with "a lightweight POSIX trampoline invoking `node dist/cli.js` or `npx spec-rails`." A POSIX shell script will not execute in standard Windows Command Prompt (`cmd.exe`) or PowerShell without WSL or Git Bash. The package should specify npm `bin` mapping (`"bin": {"spec-rails": "./dist/cli.js"}`) or a Windows `.cmd` shim.

#### 6. 🟢 Nit: Ambiguity in Changed-File Target Calculation for Mutation Presets
* **Affected Scope**: Lines 126, 130, 134, 138, 142–143
* **Discrepancy Description & Rationale**:
  Language presets specify running mutation tests against changed slice files (e.g., `--mutate '<slice-files>'` in Stryker, changed modules in mutmut/gremlins). The document does not define how `<slice-files>` is calculated or injected into the command invocation.
