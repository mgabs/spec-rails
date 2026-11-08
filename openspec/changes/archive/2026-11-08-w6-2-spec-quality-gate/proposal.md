# Proposal

## Intent

Upgrade `spec-rails check` to enforce step-by-step human review pauses across planning gates (Gate 0 → Gate 1 → Gate 2 → Gate 3) before subsequent artifacts or code diffs are created, validate file whitespace and EOF newline hygiene locally on change artifacts, run `openspec validate <change> --strict` to verify delta requirement IDs (`REQ-*`/`NFR-*`), and simplify evidence parsing in `src/utils/evidence.ts` to require a free-text `Evidence: <note>` on ticked rail tasks.

## Problem Statement

Currently:
1. `spec-rails check` allows agents to generate all planning artifacts or code diffs in a single unreviewed pass, bypassing intended human oversight.
2. Trailing whitespace and missing EOF newlines in change files fail late during pre-commit or CI hooks instead of failing fast locally during gate checks.
3. Delta requirements in `specs/` are not checked for valid canonical identifier keys (`REQ-*`/`NFR-*`), risking unkeyed or untraceable requirements entering the living spec.
4. `src/utils/evidence.ts` enforces a rigid bracketed regex format (`[CMD: ...][EXIT: 0][COVERAGE: 95%][MUTATION: 95%]`) which causes unnecessary friction and brittleness for developers and agents.

## Capabilities

### Modified Capabilities
- `openspec-addon`: Update `REQ-OSA-16` (Gate Check) to enforce sequential review pauses, formatting hygiene, and requirement key validation; update `REQ-OSA-39` to relax structured tokens to free-text `Evidence: <note>`.

## Scope

### In-Scope
- Enforce strict sequential gate ordering in `src/commands/check.ts`:
  - `proposal.md` cannot exist if Gate 0 in `research.md` is unticked or missing.
  - `design.md` or `specs/` cannot exist if Gate 1 in `proposal.md` is unticked or missing.
  - `tasks.md` cannot exist if Gate 2 in `design.md` is unticked or missing.
  - Implementation tasks cannot be ticked and `--audit` code diffs are rejected if Gate 3 in `tasks.md` is unticked or missing.
- Add local whitespace hygiene check in `check.ts` for trailing whitespace and missing EOF newlines across all files in `openspec/changes/<change>/`.
- Run `openspec validate <change> --strict` within `check.ts` and inspect delta requirement headers to ensure every requirement has a `REQ-<DOM>-<N>` or `NFR-<DOM>-<N>` key.
- Simplify `src/utils/evidence.ts` so `validateEvidenceToken` accepts any non-empty free-text following `Evidence:`.
- Update tests in `tests/unit/check.test.ts` and `tests/unit/evidence.test.ts`.

### Out-of-Scope (YAGNI)
- External python `pre-commit` CLI execution inside `check.ts`.
- Markdown AST parsing libraries (`remark`/`unified`).
- Language-specific evidence formatters or custom parsers.
- Modifying durable living specs outside of `openspec-addon`.

## Assumptions
- **ASM-GEN-1**: Node.js >= 18 is available in the execution environment.
- **ASM-GEN-2**: OpenSpec CLI (`openspec`) is installed and available on `$PATH` for strict schema validation.

## Success Metrics
- `npx spec-rails check` blocks any change where a downstream artifact exists before its prerequisite gate is ticked.
- `npx spec-rails check` blocks any change artifact containing trailing whitespace or lacking a trailing newline.
- `npx spec-rails check` blocks any delta spec requirement that lacks a `REQ-*` or `NFR-*` identifier.
- `npx spec-rails verify` passes ticked rail tasks bearing standard free-text `Evidence: <note>`.
- All unit tests pass with $\ge 95\%$ coverage.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
