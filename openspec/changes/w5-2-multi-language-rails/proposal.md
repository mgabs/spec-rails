# Proposal: Multi-Language Rails & Anti-Drift Engine

## 1. Intent

Modernize and harden Spec-Rails into a cross-platform, language-agnostic OpenSpec addon for third-party adopters across TypeScript, Python, Go, and Rust. Eliminate third-party onboarding fragility (symlinks, Makefile/Python bias, test path globs) and mechanize anti-drift rails with structured tokenized evidence.

## 2. Problem Statement

1. **Third-Party Onboarding Rigidity & Stack Bias**:
   - Blanket symlink rejection (`bin/spec-rails:46-96`) aborts installation on macOS `/var` / `$HOME`, pnpm virtual stores, and monorepos.
   - Shell scripts lack native Windows support and require external `jq`.
   - Hardcoded test discovery (`RAILS_TEST_DIRS="tests"`) fails on Go, Rust, and TypeScript conventions.
   - Missing turnkey mutation presets leave adopters without working configs for Stryker, mutmut, gremlins, or cargo-mutants.
2. **Agentic Drift in Planning and Implementation**:
   - Autonomous AI coding agents drift during planning and slice execution when relying on narrative prose instead of mechanical token verification.

## 3. Scope

### In-Scope
- **TypeScript / Node Runtime Engine (`MODIFIED NFR-OSA-1`)**: Package Spec-Rails as a self-contained single-file CLI (`dist/cli.js`) distributed via npm / npx (`@openspec/spec-rails`) with zero runtime external dependencies, dropping `jq`.
- **Universal Cross-Platform Portability**: Native execution across Linux, macOS, and Windows.
- **Canonical Path Sandboxing (`REQ-OSA-37`)**: Replace blanket symlink rejection with `fs.realpathSync` repository boundary validation.
- **Multi-Stack Initialization (`REQ-OSA-36`)**: Automatic manifest detection (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`) in `spec-rails init`.
- **Turnkey Mutation Presets (`MODIFIED NFR-OSA-5`)**: Pre-packaged configurations in `templates/presets/` enforcing `>= 95%` mutation kill score and `>= 95%` test coverage across TypeScript, Python, Go, and Rust.
- **Configurable Test Discovery (`REQ-OSA-38`)**: Support `testGlobs` in `spec-rails.config.json` for multi-directory and co-located test layouts.
- **Structured Bracketed Evidence Rail (`REQ-OSA-39`)**: Mechanically validate `Evidence: [CMD: ...] [EXIT: 0] [COVERAGE: 95%] [MUTATION: 95%]` tokens in `tasks.md`.

### Out-of-Scope (YAGNI)
- Implementing custom language compilers or proprietary mutation engines (use native ecosystem tools: Stryker, mutmut, gremlins, cargo-mutants).
- Multi-language AST parsing for contract scaffolding (rely strictly on Red-First test rails).
- Mandatory machine receipt stamping machinery (rely on deterministic regex parsing of tasks tokens).

## 4. Assumptions
- `ASM-GEN-1`: Host machine has Node.js (>= 18) installed.
- `ASM-GEN-2`: Projects adopting Spec-Rails maintain standard package manifests (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`).

## 5. Success Metrics
- Clean installation across Linux, macOS, and Windows without `jq`.
- Turnkey initialization and passing test/mutation verification on mock TS, Python, Go, and Rust repositories.
- Zero false rejections on pnpm symlinked virtual stores.
- 100% mechanical gating on $\ge 95\%$ test coverage and $\ge 95\%$ mutation score.

## 6. Capabilities
- `openspec-addon`: Modifies `NFR-OSA-1`, `NFR-OSA-5`; adds `REQ-OSA-36` (Multi-Language Presets), `REQ-OSA-37` (Canonical Path Sandboxing), `REQ-OSA-38` (Configurable Test Globs), `REQ-OSA-39` (Structured Evidence Rail).

## Review Gate
- [x] **Gate 1 Decision**: Approved by author.
