# Proposal

## Intent

Make mutation verification tool-neutral by relying on the configured mutation command's exit status. Each project configures its command to enforce its own mutation threshold.

## Problem Statement

`verify` interprets the last percentage in command output as a mutation score. Different tools can produce unrelated percentages or none at all, so this does not reliably enforce a threshold.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `openspec-addon`: delegate mutation-command threshold enforcement to the command rather than parsing its output.

## Scope

### In-Scope

- Execute configured mutation commands and fail verification on non-zero exit.
- Stop interpreting mutation command output as a score.
- Document that projects must configure mutation commands to return non-zero when their required threshold is missed.
- Update the relevant requirement and focused tests.

### Out-of-Scope (YAGNI)

- Tool-specific adapters, wrappers, language presets, and initialization changes.
- Changing coverage-command score handling or task-evidence validation.
- Retroactive approval of the archived `w5-finish-rails` gates.

## Assumptions

- **ASM-GEN-1**: Projects can configure their chosen mutation command to enforce the required threshold and return a non-zero exit when it is missed.
- **ASM-GEN-2**: Existing docs-only mutation skips and command-failure reporting remain unchanged.

## Success Metrics

- Verification reports failure for a non-zero mutation command and accepts a zero exit without interpreting its output.
- Documentation clearly states that `mutationMinScore` does not enforce the mutation command's threshold; task-evidence validation retains its existing behavior.
- Focused regression tests and the required project rails pass.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
