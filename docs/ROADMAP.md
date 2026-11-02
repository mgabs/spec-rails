# Spec-Rails Project Roadmap

Baseline: `main` · Status: Active

---

## 1. Dependency Spine & Waves

```mermaid
flowchart LR
    W1[Wave 1: Protocol & Rails] --> W2[Wave 2: CI & Review Harness Pairing] --> W3[Wave 3: OpenSpec Addon]
```

---

## 2. Work Items & Backlog

Status Legend (changed only on `main` via `chore/roadmap-<id>` branches; see `openspec/spec-rails/WORKFLOW.md` §2):
- `⬜ Planned`: Scheduled for execution.
- `🔬 In Research (Gate 0)`: Actively investigating technical feasibility and options.
- `🚀 In Progress (Gates 1–6)`: Gate 0 Go decision made; active feature branch / worktree streams.
- `✅ Shipped`: Verified, merged, living specs synced, archived.
- `❌ Dropped`: Discarded at Gate 0; rationale here, research in `openspec/changes/archive/<id>-<slug>/`.

### Wave 1: Protocol, Lifecycle & Core Templates

| ID | Item | Effort | Depends on | Status | Spec / Feature Dir | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **W1.1** | Canonical Workflow Protocol | M | — | ✅ | `rules/WORKFLOW.md` | Language-agnostic Gates 0–6, Worktrees, Rails |
| **W1.2** | Lifecycle Markdown Templates | S | W1.1 | ✅ | `templates/` | `research.md`, `proposal.md`, `spec.md`, `design.md`, `tasks.md`, `bug-report.md`, `roadmap.md` |
| **W1.3** | Project Initializer Script | S | W1.2 | ✅ | `bin/spec-rails` | Scaffolds `specs/` and `.gitignore` idempotently |
| **W1.4** | Automated Test Suite | S | W1.3 | ✅ | `tests/test_installer.sh` | Shell assertions + `Makefile` runner |

### Wave 2: CI & Review Harness Pairing

| ID | Item | Effort | Depends on | Status | Spec / Feature Dir | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **W2.1** | Pre-Commit Integration | S | W1.1 | ✅ | `.pre-commit-config.yaml` | Zero-bypass formatting, linting, tests |
| **W2.2** | Reusable GitHub CI Workflow | S | W1.2 | ✅ | `templates/spec-rails-ci.yml` | Spec-to-code audit + testing rail verification |
| **W2.3** | LGTM Review Pairing Specs | M | W1.1 | ✅ | `docs/WIKI.md` | Line-anchored `#ref` steering and anti-fraud guardrails |
| **W2.4** | Chore Lane & Contradiction Pruning | S | W1.1, W2.2 | ✅ | `rules/WORKFLOW.md` | Red-commit policy, chore lane, full-copy spec rule |

### Wave 3: OpenSpec Addon

| ID | Item | Effort | Depends on | Status | Spec / Feature Dir | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **W3.1** | OpenSpec Integration Review | M | W2.4 | ✅ | `openspec/changes/archive/2026-10-30-w3.1-openspec-addon/` | Gate 0 Go: Option A (`spec-rails` schema + thin installer); adopt OpenSpec delta specs and `openspec/` layout |
| **W3.2** | `spec-rails` OpenSpec Schema & Templates | M | W3.1 | ✅ | | `research` artifact, gate footers, slice-loop `apply.instruction` |
| **W3.3** | Gate-to-OpenSpec Mapping | M | W3.2 | ✅ | `rules/WORKFLOW.md` §7 | `REQ-*`/`NFR-*` convention in deltas; Gate 6 reduced to rails + `openspec archive` |
| **W3.4** | Installer CLI | M | W3.2 | ✅ | | Idempotent POSIX wiring into existing `openspec/` project |
| **W3.5** | Gate Enforcement | M | W3.2, W3.4 | ✅ | | CI/pre-commit Review Gate and lane checks via `openspec status --json` |
| **W3.6** | Worktree Streams vs Delta Specs | S | W3.3 | ✅ | `rules/WORKFLOW.md` §7 | Rebase + `openspec validate` discipline |
| **W3.7** | Bugfix Lane & Roadmap Mapping | S | W3.3 | ✅ | `rules/WORKFLOW.md` §7 | B1–B3 representation; `ROADMAP.md` vs OpenSpec initiatives |
| **W3.8** | Self-Migration to Addon Layout | L | W3.2–W3.5 | ✅ | | `specs/` → `openspec/`; docs, skill, rules, tests |
| **W3.9** | Addon Hygiene | S | W3.8 | ✅ | `openspec/changes/archive/2026-10-30-w3-9-addon-hygiene/` | CI audit layout, self-copy sync (REQ-OSA-21, 22) |
| **W3.10** | Cleanup & Docs | S | W3.9 | ✅ | `openspec/changes/archive/2026-10-30-w3-10-cleanup-docs/` | Dead code removal, docs lint, OpenSpec-native docs (REQ-OSA-23, 24) |
| **W3.11** | Fresh-Repo End-to-End | S | W3.10 | ✅ | `openspec/changes/archive/2026-10-30-w3-11-fresh-repo-e2e/` | Real-CLI test in a new repo (REQ-OSA-25) |
| **W3.12** | Test-Rails CI Verifier | S | W3.11 | ✅ | `openspec/changes/archive/2026-10-30-w3-12-test-rails-ci/` | CI-only traceability, evidence and config-driven test commands (REQ-OSA-26 to 28) |

---

## 3. Wave Exit Criteria

### Wave 1 Exit Criteria
- [x] All W1 items marked `✅ Shipped`.
- [x] 100% test pass on initializer suite.
- [x] Language-agnostic workflow free of stack-specific leaks.

### Wave 2 Exit Criteria
- [x] All W2 items marked `✅ Shipped`.
- [x] GitHub Actions workflow template verified.
- [x] Pre-commit hook active with zero bypass allowed.
