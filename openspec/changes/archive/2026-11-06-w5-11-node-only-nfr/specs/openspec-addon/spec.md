## MODIFIED Requirements

### Requirement: NFR-OSA-1 Dependencies
The Spec-Rails CLI and verification tooling (`@openspec/spec-rails`) MUST run on Node.js (>= 18) with OpenSpec on `PATH`, packaged as a self-contained single-file executable (`dist/cli.js`) with zero runtime production dependencies: libraries it uses MUST be bundled at build time and listed under `devDependencies`. The installer and verification tools MUST NOT require external `jq` binaries or platform-specific shell utilities.

#### Scenario: Running without external jq
- **GIVEN** an environment where `jq` is not installed
- **WHEN** `spec-rails --version` or `spec-rails verify` runs
- **THEN** it executes cleanly using native JSON parsing and exits 0

#### Scenario: Single-file bundle execution
- **WHEN** the bundled CLI executable (`dist/cli.js`) is invoked
- **THEN** it runs without requiring `node_modules` to be installed in the target project

#### Scenario: Bundled libraries are build-time only
- **GIVEN** `tsup` bundles `zod`, `cac` and `fast-glob` into `dist/cli.js`
- **WHEN** `package.json` is read
- **THEN** none of them is listed under `dependencies`

#### Scenario: Node prerequisite stated
- **WHEN** the prerequisites are read in the protocol and installer documentation
- **THEN** they name Node.js >= 18 and OpenSpec and do not list a shell trampoline as a requirement

### Requirement: NFR-OSA-5 Rails
Installer and check scripts MUST have ≥ 95% line and branch coverage under their test suite and, where a mutation tool is available for the stack, a mutation kill score of at least 95% (≥ 95%) on core logic, with every remaining surviving mutant justified in the PR (equivalent mutant or accepted risk). The workflow protocol, schema instructions, templates, and documentation MUST state the same thresholds and MUST NOT state any other mutation threshold.

#### Scenario: Rails
- **WHEN** the test and mutation suites run
- **THEN** line and branch coverage is at least 95% and the mutation kill score is at least 95%

#### Scenario: Survivor justification
- **GIVEN** a mutation run at or above 95% with surviving mutants
- **WHEN** the PR is reviewed
- **THEN** each surviving mutant is listed with a reason, and killable survivors without a reason block merge

#### Scenario: Single threshold in shipped docs
- **WHEN** the protocol, schema, skills, templates and docs are searched for a mutation kill threshold
- **THEN** every match states at least 95% and none states 90% or 100%

## Review Gate
- [x] **Gate 2 Approval**: Specifications reviewed and approved by human before technical design.
