# Proposal

## Intent

Close the three stale Dependabot pull requests whose dependency updates are already present on `main`. Preserve a clear explanation on each PR without merging duplicate changes.

## Problem Statement

Dependabot PRs #7, #9, and #10 remain open even though current `main` already contains their proposed or newer dependency versions. The open duplicates create review and notification noise and could be mistaken for pending upgrades.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- None. This is a repository housekeeping chore with no spec-level behavior change.

## Scope

### In-Scope
- Immediately before closure, verify each PR is still open and its changes are fully superseded by current `main`.
- Close each confirmed-superseded PR with a brief comment naming the superseding dependency version or update.
- Stop and report rather than close any PR whose state or diff no longer matches the review.

### Out-of-Scope (YAGNI)
- Merging PRs #7, #9, or #10.
- Changing dependency manifests, lockfiles, or Dependabot configuration.
- Closing any other pull request or changing the broader dependency-update policy.
- Closing issue #19 as part of this proposal.

## Assumptions
- **ASM-GEN-1**: Current `main` remains authoritative; each PR will be rechecked against it immediately before closure.
- **ASM-GEN-2**: A PR is eligible for closure only when all of its proposed changes are already present or superseded on `main`.

## Success Metrics
- Every eligible PR among #7, #9, and #10 is closed with a specific explanation.
- No PR is merged, and no PR with unique changes is closed.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
