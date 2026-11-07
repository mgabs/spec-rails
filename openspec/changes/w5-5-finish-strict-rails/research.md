# Research & Technical Tradeoffs

## 1. Intent & Ground Truth

Issue #20 tracks remaining scope for W5.5 ("Strict Rails by Default"):
- `spec-rails verify` executes configured test, coverage, and mutation commands.
- Currently, `runVerify` configures `mutation` without passing `minScore: config.mutationMinScore`, allowing commands that exit 0 without reporting a score or falling below threshold to pass silently.
- Mutation runs can loop infinitely if mutants introduce infinite loops; child process execution requires an enforced timeout.
- While Issue #20 mentioned Python-specific tooling (`uv.lock`, Mutmut 3), Spec-Rails is a language-neutral TypeScript CLI. Hardcoding language-specific package manager detection or custom runner scripts violates YAGNI. Every stack (TS, Python, Go, Rust) configures its commands in `spec-rails.config.json`; `verify` enforces the contract universally.

## 2. Options Explored

**Option A: Universal Strict Mutation Rail & Process Timeout (Recommended)**
- `verify`: Pass `minScore: config.mutationMinScore` to the mutation rail.
- Require output to report a numeric percentage score $\ge$ threshold; fail if score is missing or below threshold.
- Fail on non-zero exit.
- Enforce a process execution timeout (e.g. 600s / 10m) in `defaultExec`.
- Zero language-specific code or presets.

**Option B: Language-Specific Mutation Adapters**
- Add special detection for `uv.lock`, Mutmut 3, and embedded Python runner templates.
- Rejected: Unnecessary bloat and fragile coupling to external tool version churn. Adopters manage their own tool commands.

## 3. Tradeoff Matrix

| Criteria | Option A (Universal Contract) | Option B (Language Adapters) |
| :--- | :--- | :--- |
| **Complexity** | Minimal (~20 lines in `verify.ts`) | High (custom runners + TOML parsing) |
| **New Dependencies** | None | Potential language/tool parsers |
| **Maintenance Burden** | Lowest (one stable contract for all stacks) | High (tool ecosystem churn) |
| **Blast Radius** | Low (confined to `verify.ts`) | High (installer, presets, templates) |

## 4. Recommendation

Choose Option A. Keep Spec-Rails 100% language-neutral: enforce `mutationMinScore` and execution timeout in `verify`, and leave tool selection and command configuration to the adopter.

## 5. Breaking Changes & Deprecations

- `REQ-OSA-47`: Modified to enforce `mutationMinScore` in `verify`, requiring output to contain a valid score percentage $\ge$ threshold, failing on missing or below-threshold scores, and enforcing an execution timeout.

## Review Gate
- [x] **Gate 0 Decision**: Go (Option A).
