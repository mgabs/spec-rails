@REQ-OSA-36 @REQ-OSA-37 @REQ-OSA-38 @REQ-OSA-39 @NFR-OSA-1 @NFR-OSA-5
Feature: Spec-Rails Multi-Language Presets, Canonical Path Sandboxing, and Anti-Drift Rails
  As an engineering team adopting Spec-Rails in non-shell or multi-language projects
  We want turnkey stack auto-detection, canonical path sandboxing, configurable test globs, and structured evidence verification
  So that Spec-Rails works seamlessly across TypeScript, Python, Go, and Rust without symlink failures or agentic drift.

  @NFR-OSA-1
  Scenario: Node CLI bundled execution without external jq
    Given an environment where "jq" is not installed
    When "spec-rails --version" runs via Node
    Then it executes cleanly using native JSON parsing and exits 0

  @REQ-OSA-37
  Scenario: Canonical path sandboxing resolves symlinks without traversal
    Given a project repository with pnpm symlinked virtual stores or monorepo workspaces
    When "spec-rails" validates target paths
    Then it resolves canonical paths using realpathSync and allows whitelisted store links while blocking escape traversal

  @REQ-OSA-36
  Scenario: Auto-detection of project manifests during initialization
    Given an uninitialized repository with a package manifest
    When "spec-rails init --stack=auto" executes
    Then it identifies the stack and scaffolds "spec-rails.config.json" with matching test and mutation presets

  @REQ-OSA-38
  Scenario: Configurable test glob discovery
    Given a repository with co-located tests or custom test paths
    When "spec-rails verify" executes test discovery
    Then it resolves matching test files according to "testGlobs" in "spec-rails.config.json"

  @REQ-OSA-39 @NFR-OSA-5
  Scenario: Mechanical verification of structured evidence tokens
    Given a slice with "tasks.md" recording execution evidence
    When "spec-rails verify" inspects the evidence tokens
    Then it verifies exit code is 0, test coverage is at least 95%, and mutation kill score is at least 95%
