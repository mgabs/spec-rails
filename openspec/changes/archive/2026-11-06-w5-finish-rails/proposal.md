## Why

Close Wave 5: strict rails execution (W5.5), gate baseline (W5.6), CI template fixes (W5.7), agent skill docs (W5.9).

## What Changes

- `verify` executes test/coverage/mutation commands, enforces thresholds, skips mutation on docs-only changesets (REQ-OSA-47).
- `check` honours `openspec/spec-rails/baseline.txt`; `check --baseline` writes it (REQ-OSA-48).
- CI template pins OpenSpec, sets up uv/Python, derives pre-commit `SKIP` (REQ-OSA-49).
- Docs cover `/opsx-*` vs `openspec-*` names and skill footprint (REQ-OSA-50).

## Capabilities

### New Capabilities
- `openspec-addon`: REQ-OSA-47..50

## Impact

`src/commands/verify.ts`, `src/commands/check.ts`, `src/cli.ts`, `templates/spec-rails-ci.yml`, docs.
