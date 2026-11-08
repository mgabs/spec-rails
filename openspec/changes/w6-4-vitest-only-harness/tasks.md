# Tasks: Vitest-Only Harness & Dead Code Deletion (W6.4)

## 1. Dependency DAG

```mermaid
flowchart TD
    S1["Slice 1: Native Vitest Ports (schema, hygiene, selfcopy)"] --> S2["Slice 2: Delete Legacy Tests & Makefile"]
    S2 --> S3["Slice 3: Update Pre-commit, Workflows & Package Scripts"]
    S3 --> S4["Slice 4: Rebase, Verification & Archive (Gate 4)"]
```

## 2. Streams & Worktrees

| Stream | Worktree Path | Branch | Prerequisite |
| :--- | :--- | :--- | :--- |
| Stream 1 | `.worktrees/w6-4-vitest-harness-cleanup` | `feat/w6-4-vitest-harness-cleanup` | Gate 3 Approval |

## 3. Slice 1: Native Vitest Ports (`tests/unit/`)

- [ ] 3.0 Contract scaffolding: declare test skeletons for `schema.test.ts`, `hygiene.test.ts`, and `selfcopy.test.ts`
- [ ] 3.1 Red unit tests fail for expected reasons (verify: test failure observed; append trailing evidence when ticking)
- [ ] 3.2 Green implementation: port checks from `test_schema.sh`, `check_hygiene.sh`/`test_lint.sh`, and `test_selfcopy.sh` to TypeScript (verify: `npx vitest run`; append trailing evidence when ticking)
- [ ] 3.3 Coverage >= 95% and mutation >= 95% kill (verify: reports; append trailing evidence when ticking)

## 4. Slice 2: Delete Legacy Tests & Makefile

- [ ] 4.0 Contract scaffolding: verify all `REQ-OSA-*` tags from deleted shell scripts are preserved in `tests/unit/`
- [ ] 4.1 Red check: identify all build / CI steps that invoke `make` or `tests/*.sh` (verify: grep output; append trailing evidence when ticking)
- [ ] 4.2 Green implementation: remove `Makefile` and all 9 `tests/*.sh` scripts (verify: `ls tests/`; append trailing evidence when ticking)
- [ ] 4.3 Coverage & regression check: full Vitest suite passes without shell scripts (verify: `npx vitest run`; append trailing evidence when ticking)

## 5. Slice 3: Update Pre-commit, Workflows & Package Scripts

- [ ] 5.0 Contract scaffolding: define updated pre-commit hooks and GitHub workflow actions
- [ ] 5.1 Red check: simulate pre-commit without `make` (verify: hook failure observed if make is called; append trailing evidence when ticking)
- [ ] 5.2 Green implementation: update `.pre-commit-config.yaml`, `.github/workflows/test.yml`, `package.json`, and `README.md` (verify: `pre-commit run --all-files`; append trailing evidence when ticking)
- [ ] 5.3 Verification: full check and verify pass cleanly (verify: `node dist/cli.js check && node dist/cli.js verify`; append trailing evidence when ticking)

## 6. Integration & Rebase Plan
- [ ] 6.1 Human Comprehension Verification: reviewer can explain all changes line-by-line
- [ ] 6.2 Merge to main via `--ff-only`, run `openspec archive w6-4-vitest-only-harness --yes`, push to `origin/main`

## Review Gate
- [x] **Gate 3 Approval**: Tasks breakdown approved by human before writing test code.
