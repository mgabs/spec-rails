# Proposal

## Intent
Replace legacy shell scripts with a native TypeScript CLI (`init`, `check`, `audit`, `verify`) under Node.js >= 18, eliminate the external `jq` dependency, centralize spec-to-code mapping rules in TypeScript, and deprecate `rails.conf` in favor of `spec-rails.config.json`.

## Problem Statement
1. The project currently maintains dual implementations: shell scripts in `bin/` and nascent TypeScript commands in `src/`.
2. `spec-rails-check` exists only as a 276-line shell script requiring `jq` and `awk`, preventing Windows portability and creating brittle JSON parsing.
3. Spec-to-code audit rules are duplicated as inline shell code in `templates/spec-rails-ci.yml` rather than being reusable in local pre-commit hooks and IDEs.
4. `rails.conf` relies on shell variable sourcing rather than structured JSON validation.

## Capabilities

### Modified Capabilities
- `openspec-addon`: Specify TypeScript CLI command suite (`check`, `audit`, `verify`, `init`), deletion of shell scripts, removal of `jq`, and migration from `rails.conf` to `spec-rails.config.json`.

## Scope

### In-Scope
- Implement `src/commands/check.ts` covering gate states, branch protection, transitive DAG violations, and early task ticking.
- Implement `src/commands/audit.ts` (or `check --audit`) implementing spec-to-code changeset verification.
- Complete `src/commands/init.ts` scaffolding parity (OpenSpec schema wiring, config scaffolding, skill install, gitignore).
- Update `src/commands/verify.ts` to read `spec-rails.config.json` with fallback migration from `rails.conf`.
- Delete `bin/spec-rails`, `bin/spec-rails-check`, `bin/spec-rails-verify`.
- Update `templates/spec-rails-ci.yml`, `.pre-commit-config.yaml`, and workflows to call `npx spec-rails`.
- Update unit and integration tests to target TypeScript CLI.

### Out-of-Scope (YAGNI)
- Backward compatibility wrappers for Node.js < 18.
- Modifying upstream OpenSpec core behavior.

## Assumptions
- **ASM-GEN-1**: All adopter environments provide Node.js >= 18 and npm.
- **ASM-GEN-2**: `openspec` CLI outputs standard JSON when invoked with `--json`.

## Success Metrics
- `bin/` directory is completely removed; zero dependency on `jq`.
- `npm run build` succeeds and `npm test` passes with full coverage.
- `npx spec-rails check` validates gates, branch protection, and spec-to-code audit.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
