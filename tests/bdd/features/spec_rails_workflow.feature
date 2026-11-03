Feature: Spec-Rails Workflow Lifecycle
  As a development team and autonomous coding agent
  We want to execute features, bugfixes, and chores under strict rails
  So that code is never built on unverified assumptions, specifications remain evergreen, and branches remain pristine.

  @REQ-OSA-12 @REQ-OSA-29
  Scenario: Bootstrap a clean repository with Spec-Rails structure
    Given a fresh git repository
    When I initialize Spec-Rails using "bin/spec-rails"
    Then the file "openspec/spec-rails/WORKFLOW.md" should exist
    And the directories "openspec/changes", "openspec/specs", "openspec/changes/archive" should exist
    And the file ".pre-commit-config.yaml" should be configured
    And ".worktrees/" should be ignored in ".gitignore"

  @REQ-OSA-7 @REQ-OSA-9 @REQ-OSA-10 @REQ-OSA-30
  Scenario: Feature Gate 0 Go decision advances to Proposal and archives via openspec archive
    Given an initialized Spec-Rails repository
    When a developer selects item "W1.1" from "docs/ROADMAP.md"
    And starts feature branch "feat/w1-1-core-contracts"
    And conducts Gate 0 research in "openspec/changes/w1-1-core-contracts/research.md"
    And developer approves Option A
    Then the status in "docs/ROADMAP.md" can be updated to In Progress
    And Gate 1 proposal and Gate 2 capability delta specs can be drafted and archived via "openspec archive"

  @REQ-OSA-10 @REQ-OSA-30
  Scenario: Feature Gate 0 No-Go archives research and drops item without dirtying code
    Given an initialized Spec-Rails repository
    When a developer researches item "W1.2" on branch "feat/w1-2-unfeasible-service"
    And Gate 0 research reveals the feature is unfeasible
    Then the research artifact is archived to "openspec/changes/archive/w1-2-unfeasible-service/research.md"
    And "docs/ROADMAP.md" records status "❌ Dropped" with rationale
    And the feature branch is deleted with zero production code changes

  Scenario: Chore lane merges zero-behavior-change commits without gates
    Given an initialized Spec-Rails repository
    When a developer creates a branch "chore/update-docs"
    And modifies "README.md" without altering production code
    And verifies pre-commit and test suites pass
    Then the branch merges fast-forward into "main" without requiring feature gates

  @REQ-OSA-30
  Scenario: Fast-track bugfix reproduces defect red-first, fixes green, and updates living specs
    Given an initialized Spec-Rails repository with production code
    When a defect is discovered in production code
    And an isolated worktree ".worktrees/fix-timeout" is spawned off "main"
    And a bug report in "docs/bug-reports/" is logged inside the worktree
    And a regression test fails on unmodified code
    And a minimal surgical fix makes the test pass
    And the living specs are updated to reflect the fix
    Then the bugfix merges fast-forward into "main" and the worktree is pruned
