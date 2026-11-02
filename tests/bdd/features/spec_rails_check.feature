@REQ-OSA-16 @REQ-OSA-17 @REQ-OSA-18 @NFR-OSA-3
Feature: spec-rails gate and lane check
  As a team using the spec-rails schema
  We want a check runnable from pre-commit and CI
  So that artifacts cannot advance past an unticked human gate or land on main.

  @REQ-OSA-16
  Scenario: Unticked gate blocks later artifacts
    Given a change whose "proposal.md" exists with an unticked Gate 1 box
    And a "specs/" artifact is present
    When the gate check runs
    Then it exits non-zero
    And the output names the change and the unticked gate

  @REQ-OSA-16
  Scenario: Ticked gates pass
    Given a change whose gates for every present predecessor artifact are ticked
    When the gate check runs
    Then it exits 0

  @REQ-OSA-16
  Scenario: Artifact missing its gate section
    Given a change whose "proposal.md" has no Gate checkbox and "specs/" is present
    When the gate check runs
    Then it exits non-zero naming the change and "proposal"

  @REQ-OSA-16
  Scenario: Multiple violations are all reported
    Given two changes each with an unticked gate before a later artifact
    When the gate check runs
    Then it exits non-zero
    And both changes are named in the output

  Scenario: No active changes
    Given "openspec status --json" reports no changes
    When the gate check runs
    Then it exits 0

  @REQ-OSA-17
  Scenario: Direct commit on main
    Given the current branch is "main"
    When the check runs
    Then it exits non-zero
    And it also fails on "master"

  @REQ-OSA-17
  Scenario: Feature branch is allowed
    Given the current branch is "feat/x"
    When the check runs
    Then the lane check passes

  Scenario: Malformed status output
    Given "openspec status --json" returns invalid JSON
    When the gate check runs
    Then it exits non-zero
    And the output contains the parse error

  @REQ-OSA-18
  Scenario: Artifact presence comes from openspec
    Given the check is run with a stub "openspec" on PATH
    Then artifact presence is read from the stub's "status --json" output
    And the check does not parse "schema.yaml"

  @NFR-OSA-3
  Scenario: Gate check latency budget
    Given 20 active changes in "openspec/changes/"
    When the gate check runs
    Then it completes within 3 seconds excluding "openspec status" calls
