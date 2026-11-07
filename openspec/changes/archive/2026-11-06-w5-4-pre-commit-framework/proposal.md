# Proposal

## Intent
Standardize exclusively on the Python `pre-commit` framework for git hook execution: discontinue manual writing to `.git/hooks/pre-commit`, integrate branch protection into `.pre-commit-config.yaml`, customize test/lint hooks to the detected language stack, and run `pre-commit install` cleanly.

## Problem Statement
1. Writing raw hook scripts into `.git/hooks/pre-commit` causes collisions when adopters run `pre-commit install`, resulting in `.legacy` backup files and duplicated hook executions.
2. The bundled `.pre-commit-config.yaml` defaults to `make test` and `make lint`, which fails or skips silently in non-Make repositories (Python, Go, Rust, modern TS).
3. Branch protection rules were isolated in the raw hook rather than governed transparently by pre-commit.

## Capabilities

### Modified Capabilities
- `openspec-addon`: Add requirement `REQ-OSA-46` (Pre-Commit Framework Integration) specifying framework-driven hook setup and stack-aware hook generation.

## Scope

### In-Scope
- Remove direct `.git/hooks/pre-commit` generation from `src/commands/init.ts`.
- Include branch protection as a local hook within `.pre-commit-config.yaml`.
- Populate stack-specific test commands (`npm test`, `pytest`, `cargo test`, `go test`) in `.pre-commit-config.yaml` based on detected stack.
- Invoke `pre-commit install` during `init` if git is initialized and `pre-commit` is found.
- Clean up any legacy `.git/hooks/pre-commit.legacy` hook files.

### Out-of-Scope (YAGNI)
- Implementing custom hook managers outside the `pre-commit` framework.
- Installing Python or pre-commit binary automatically if missing.

## Assumptions
- **ASM-GEN-1**: The pre-commit framework is installed on the developer's PATH or provided in CI.
- **ASM-GEN-2**: In environments lacking `pre-commit`, `init` emits a clear configuration warning without failing the initialization.

## Success Metrics
- `init` creates no manual script in `.git/hooks/pre-commit`.
- Installing in a repo with pre-commit leaves no `.legacy` hook.
- Generated `.pre-commit-config.yaml` contains stack-appropriate test commands and passes `pre-commit run --all-files`.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
