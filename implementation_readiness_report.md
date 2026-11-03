# Stage 9 Review Report: Implementation Readiness Test

* **Target:** `docs/designs/multi-language-rails-anti-drift.md` (lines 210..273)
* **Auditor:** EGM Multi-Lens Synthesizer (`egm-implementation-readiness`, `egm-codebase-details`, `egm-style`)
* **Reviewers Status:**
  - `egm-implementation-readiness`: completed
  - `egm-codebase-details`: completed
  - `egm-style`: completed

---

## Severity Summary
- 🔴 **Blocker**: 2
- 🟡 **Major**: 5
- 🟢 **Nit**: 2
- **Total Findings**: 9

---

## Prioritized Findings (Blockers -> Major -> Nits)

### 1. Architectural Contradiction & Spec Breach with NFR-OSA-1 - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** `Lines 214–235` (Section 7.1), `Lines 236–262` (Section 7.2)
* **Discrepancy Description**: Section 7 pivots Spec-Rails into a TypeScript/Node.js package (`package.json`, `dist/cli.js`, `tsup`) and turns `bin/spec-rails` into a Node trampoline. However, `concepts_brief.md` explicitly lists rewriting the installer and verifier in TypeScript as a **Rejected Alternative** (violating `NFR-OSA-1`), and living specification `openspec/specs/openspec-addon/spec.md` strictly enforces `NFR-OSA-1: Dependencies` ("The installer and checks MUST be POSIX sh; no new runtime dependency beyond openspec, git and standard utilities"). Section 7 contains no delta spec migration plan for modifying or deprecating `NFR-OSA-1`, nor does it address how non-Node adopters (pure Go, Rust, or Python codebases) can run verifications without forcing a Node.js runtime installation.
* **Rationale & Recommendation**: A design cannot silently violate living spec invariants without an explicit `## MODIFIED Requirements` delta spec. Either:
  1. Add an explicit Phase 0 task to propose a delta spec deprecating/updating `NFR-OSA-1` to permit Node.js runtimes (and update `concepts_brief.md`), or
  2. Maintain standalone zero-dependency distribution (e.g. single-file binary or preserving pure shell verification fallback for non-Node environments).

---

### 2. Contract Scaffolding AST Parsing Algorithm Underspecified - Severity: 🔴 Blocker
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** `Line 225`, `Lines 249–251` (Section 7.1 & 7.2)
* **Discrepancy Description**: `src/commands/scaffold.ts` is required to mechanically verify that slice commit #1 contains zero executable statements in newly introduced function bodies across TypeScript, Python, Go, and Rust. However, Section 7 lists only `tsup`, `vitest`, `zod`, and `fast-glob` in `package.json` (Line 216). There are no AST parsing libraries or grammar parsers (e.g. `web-tree-sitter`, `@babel/parser`, etc.) specified. Relying on ad-hoc regex line matching across 4 distinct languages is severely brittle and will produce false positives/negatives on multiline declarations, comments, nested closures, and struct initializations.
* **Rationale & Recommendation**: Implementers cannot build multi-language syntax verification without an explicit parsing engine. Specify the parsing architecture: either integrate Tree-Sitter (adding grammar packages to `package.json`) or provide a formal line-token grammar specification detailing how empty signatures vs executable statements are distinguished per language.

---

### 3. Preset and Schema Target Directory Path Misalignment - Severity: 🟡 Major
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** `Lines 227–231` (Section 7.1)
* **Discrepancy Description**: Section 7.1 places presets and schemas at root `schemas/spec-rails.schema.json` and `schemas/spec-rails/presets/{ts,python,go,rust}/*`. In the existing repository, the schema bundle lives at `openspec/schemas/spec-rails/` (per `REQ-OSA-1`), and templates live in `templates/` / `openspec/spec-rails/mutation/` (per `REQ-OSA-12` and `REQ-OSA-14`). A root `schemas/` directory does not currently exist. Introducing a disconnected root directory breaks `openspec schemas` resolution and installer copy paths.
* **Rationale & Recommendation**: Align preset paths with OpenSpec repository conventions (`openspec/schemas/spec-rails/presets/` or `templates/presets/`) and detail how `spec-rails init` locates bundled templates when running as a globally installed npm package (`dist/`).

---

### 4. Unaddressed Lifecycle of `bin/spec-rails-verify` & `spec-rails-check` - Severity: 🟡 Major
* **Reviewer Lens:** `egm-codebase-details`
* **Affected Scope:** `Line 224`, `Line 232`, `Line 256`
* **Discrepancy Description**: Line 232 states `bin/spec-rails` will be replaced with a POSIX trampoline invoking `node dist/cli.js`. However, `bin/spec-rails-verify` and `openspec/spec-rails/spec-rails-check` are omitted from the file table. Current CI workflows (`.github/workflows/spec-rails-ci.yml`) and pre-commit hooks invoke `sh openspec/spec-rails/spec-rails-verify` and `sh openspec/spec-rails/spec-rails-check`. If verification moves to `src/commands/verify.ts`, existing hooks and CI will break unless their migration is planned.
* **Rationale & Recommendation**: Add `bin/spec-rails-verify` and `openspec/spec-rails/spec-rails-verify` to Section 7.1. Specify whether they are converted to trampolines pointing to `spec-rails verify` or replaced by CLI invocations in `.pre-commit-config.yaml` and `.github/workflows/`.

---

### 5. CLI Subcommand and Flag Tooling Omitted from `package.json` - Severity: 🟡 Major
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** `Line 216`, `Line 219` (Section 7.1)
* **Discrepancy Description**: Line 219 defines subcommands (`init`, `verify`, `scaffold-check`, `lint`) and multiple global flags (`--help`, `--version`, `--verbose`, `--slice`, `--strict`, `--stack`). Line 216 specifies dependencies in `package.json` but lists no CLI parsing library (e.g., `cac`, `commander`, or `citty`). Hand-rolling multi-command argument parsing in raw Node `process.argv` introduces parsing edge cases and violates YAGNI.
* **Rationale & Recommendation**: Add an established, zero-weight CLI parser (e.g., `cac` or `commander`) to `package.json` build dependencies in Line 216.

---

### 6. Evidence Token Regex Grammar & Escaping Edge Cases Unspecified - Severity: 🟡 Major
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** `Line 222`, `Lines 270–273`
* **Discrepancy Description**: Evidence parsing is specified as bracketed tokens: `Evidence: [CMD: ...] [EXIT: 0] [COVERAGE: 95%] [MUTATION: 95%]`. Real-world test invocations frequently contain brackets or quotes (e.g. `pytest -k "test_a[param]"`, regex filters, or glob arrays). A naive bracket regex will truncate or fail. The plan omits token escaping rules, token ordering constraints, and error recovery in `src/utils/evidence.ts`.
* **Rationale & Recommendation**: Define the token grammar in Section 7 (or reference a parser spec), support escaped or quoted brackets inside `CMD`, and explicitly specify whether token order is invariant or flexible.

---

### 7. Git Diff & Slice Commit Resolution Mechanism Undefined - Severity: 🟡 Major
* **Reviewer Lens:** `egm-implementation-readiness`
* **Affected Scope:** `Lines 225–226`, `Line 249`
* **Discrepancy Description**: `scaffold.ts` and `lint.ts` inspect "slice commit #1" and "staged diffs". In Git worktrees (`.worktrees/<id>-<stream>`), resolving the root commit of a slice relative to the base branch requires git plumbing (`git merge-base`, `git rev-list`). The implementation plan specifies no git abstraction layer, child process execution model, or error handling for detached HEAD or shallow clones in CI.
* **Rationale & Recommendation**: Add the Git execution architecture to Section 7 (specifying `node:child_process` `execFileSync` invocations and specific rev-list / diff commands used to isolate slice commit #1).

---

### 8. Mutation Threshold Inconsistency (95% vs Existing >90%) - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** `Line 228`, `Line 260`, `Line 269`, `Line 272`
* **Discrepancy Description**: Section 7 uniformly specifies `>= 95%` mutation kill score. However, living specification `NFR-OSA-5`, `README.md`, and `docs/WIKI.md` state `> 90% mutation kill score`. While 95% is a stricter rail, updating it without an explicit note on the threshold bump creates contradictory references between new config presets and existing repo documentation.
* **Rationale & Recommendation**: Clarify in Section 7.3 that the mutation threshold is being increased from 90% to 95%, and include doc updates in Phase 5 to keep documentation synchronized.

---

### 9. Missing CI Migration Task in Staging Rollout - Severity: 🟢 Nit
* **Reviewer Lens:** `egm-style`
* **Affected Scope:** `Lines 236–262` (Section 7.2)
* **Discrepancy Description**: Section 7.2 outlines Phases 1–5, ending with self-hosting and doc updates. However, it lacks a discrete step in Phase 5 to update `.github/workflows/spec-rails-ci.yml` from running shell scripts to running `npm run build && npm test && npm run mutate`.
* **Rationale & Recommendation**: Add an explicit task under Phase 5: "Update `.github/workflows/spec-rails-ci.yml` to install Node 22, run Vitest test rails, and execute Stryker mutation checks."
