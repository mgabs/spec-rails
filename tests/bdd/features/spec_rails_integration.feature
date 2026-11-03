@REQ-OSA-12 @REQ-OSA-16 @REQ-OSA-17
Feature: spec-rails end-to-end in an OpenSpec project
  As a team running OpenSpec
  We want the installed hook and CI to run the gate and lane check
  So that unapproved gates and direct commits to main are blocked automatically.

  Scenario: Install then check in a scratch openspec project (REQ-OSA-12, 16, 17)
    Given a scratch git repo with "openspec/" and OpenSpec >= 1.15.0
    When the installer runs
    Then "openspec/spec-rails/spec-rails-check" is installed and executable
    And the git pre-commit hook invokes it when present

  Scenario: Hook blocks an unticked gate (REQ-OSA-16)
    Given an installed project on branch "feat/x"
    And a change with "proposal.md" Gate 1 unticked and a "specs/" artifact present
    When "git commit" runs
    Then the hook exits non-zero naming the change and the gate

  Scenario: Hook passes when gates are ticked (REQ-OSA-16)
    Given an installed project on branch "feat/x" whose gates are ticked
    When the pre-commit hook runs
    Then it exits 0

  Scenario: CI workflow runs the check (REQ-OSA-16)
    Given the installed ".github/workflows/spec-rails-ci.yml"
    Then it contains a step that runs "spec-rails-check"
    And the existing spec-to-code audit step and "make test" step are still present

  Scenario: Existing hook behaviour preserved (REQ-OSA-12)
    Given an installed project
    Then the hook still blocks commits on "main" and unresolved ".lgtm/reviews" "#ref" directives
