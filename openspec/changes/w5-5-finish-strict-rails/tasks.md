# Tasks

## 1. Dependency DAG

```mermaid
flowchart TD
    G4[Gate 4 Approval] --> S1[Slice 1: Strict Mutation Rails & Timeout]
    S1 --> S2[Slice 2: CLI Cleanup & Dead Code Removal]
    S2 --> S3[Slice 3: Docs, README & Roadmap Sync]
    S3 --> INT[Integration & Archive]
```

## 2. Streams & Worktrees

| Stream | Worktree Path | Branch | Prerequisite |
| :--- | :--- | :--- | :--- |
| Sequential Core Rails | `.worktrees/w5-5-finish-strict-rails` | `feat/w5-5-finish-strict-rails` | Gate 4 Approval |

## 3. Slice 1: Strict Mutation Rails & Execution Timeout

- [ ] 3.0 Contract scaffolding: declare timeout handling and `minScore` wiring in `src/commands/verify.ts` (verify: `npm run lint` passes).
- [ ] 3.1 BDD scenarios in `tests/bdd/features/openspec_addon.feature` for `REQ-OSA-47` (verify: scenarios committed).
- [ ] 3.2 Gate 5.1 human sign-off on Slice 1 BDD scenarios.
- [ ] 3.3 Red: unit tests fail when mutation output lacks a score, is below `mutationMinScore`, or execution times out (verify: `npm test -- tests/unit/verify.test.ts` fails).
- [ ] 3.4 Green: wire `mutationMinScore` into mutation rail in `runVerify`, enforce score parsing in `runRail`, add process timeout to `defaultExec` (verify: `npm test` passes).
- [ ] 3.5 Coverage >= 95% line & branch and Stryker >= 95% kill on `src/commands/verify.ts` (verify: `npm run test:coverage` and Stryker report).

## 4. Slice 2: CLI Dead Code Removal & Preset Cleanup

- [ ] 4.0 Contract scaffolding: remove dead `lint` stub and unused `--slice` option from `src/cli.ts` (verify: `npm run lint` passes).
- [ ] 4.1 BDD / unit tests in `tests/unit/cli.test.ts` verifying CLI command list and options (verify: tests pass).
- [ ] 4.2 Gate 5.2 human sign-off on CLI cleanup.
- [ ] 4.3 Red: test fails if dead `lint` command is invoked (verify: `cli.test.ts` failure shown).
- [ ] 4.4 Green: clean `src/cli.ts`, eliminate stale `templates/mutation/` duplicate configs, and build with `npm run build` (verify: `npm test` passes).
- [ ] 4.5 Coverage and mutation >= 95% on `src/cli.ts` (verify: coverage and Stryker report).

## 5. Slice 3: Docs, README & Living Spec Sync

- [ ] 5.0 Contract scaffolding: confirm target sections in `README.md`, `docs/ROADMAP.md`, and `openspec/specs/openspec-addon/spec.md`.
- [ ] 5.1 BDD scenarios: verified covered in Slices 1 and 2.
- [ ] 5.2 Gate 5.3 human sign-off on living spec sync, README modernization, and roadmap closeout.
- [ ] 5.3 Red: confirm living spec does not yet contain strict mutation score assertions (verify: grep returns empty).
- [ ] 5.4 Green: sync `REQ-OSA-47` to living spec, modernize `README.md` for TS CLI / remove shell & jq references, update `docs/ROADMAP.md` W5.5 row and Wave 5 Exit Criteria (verify: `node dist/cli.js verify` passes).
- [ ] 5.5 Coverage and mutation not applicable for markdown/docs sync (verify: diff contains docs only).

## 6. Integration & Rebase Plan

- [ ] 6.1 Human Comprehension Verification: reviewer can explain all generated logic line-by-line.
- [ ] 6.2 Merge streams, rebase on main, verify full project rails, and archive change.

## Review Gate
- [ ] **Gate 4 Approval**: Tasks breakdown approved by human before writing test code.
