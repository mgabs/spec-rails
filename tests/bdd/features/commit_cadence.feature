@REQ-OSA-25 @REQ-OSA-40
Feature: Commit cadence at stage boundaries
  As a Spec-Rails maintainer
  We want commits to follow completed stages instead of every gate tick
  So that history stays reviewable without weakening the gates.

  Scenario: Cadence documented consistently (REQ-OSA-40)
    Given the protocol, the schema instructions and the lifecycle how-to
    When each is read
    Then each states the planning, code and archive commits as the default
    And each lists green slice commits, rebases and stream merges, and the bugfix and chore lanes as exceptions

  Scenario: Multiple code slices (REQ-OSA-40)
    Given a change with several code slices
    When the cadence is read
    Then one commit per slice is acceptable, each green per Rule 4

  Scenario: No per-gate commit instruction (REQ-OSA-40)
    Given the shipped docs, schema and templates
    When the hygiene check runs
    Then it exits 0 when none tells the reader to commit a gate before the next artifact
    And it exits non-zero naming the file when one does

  Scenario: Batched planning passes the check (REQ-OSA-40)
    Given all five planning artifacts exist with their gates ticked
    When they are committed in one commit on a feature branch
    Then the commit succeeds and "spec-rails-check" exits 0

  Scenario: Gate tick committed with the next artifact (REQ-OSA-25)
    Given the Gate 0 box is ticked in "research.md"
    When I commit "research.md" and "proposal.md" together
    Then the commit succeeds

  Scenario: Working-tree check (REQ-OSA-40, ASM-GEN-3)
    Given a gate is ticked in the working tree but not committed
    When "spec-rails-check" runs
    Then it evaluates the ticked state and does not inspect git history

  Scenario: Mid-stage commit allowed (REQ-OSA-40)
    Given a feature branch with a ticked upstream gate
    When I commit a single artifact
    Then the hook does not reject the commit for cadence
