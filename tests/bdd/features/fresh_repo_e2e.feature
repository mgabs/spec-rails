@REQ-OSA-25 @NFR-OSA-8
Feature: Spec-Rails on top of OpenSpec in a fresh repository
  REQ-OSA-25, NFR-OSA-8

  Background:
    Given a new git repository initialised with the real "openspec init"
    And "spec-rails" has been installed into it
    And I am on branch "feat/demo" with a change "demo"

  Scenario: Schema resolved and artifact order
    When I run "openspec status --change demo --json"
    Then the schema name is "spec-rails"
    And the artifacts are research, proposal, specs, design, tasks in that order

  Scenario: Unticked gate blocks commit
    Given "research.md" has an unticked Gate 0 box
    When I commit "proposal.md"
    Then the pre-commit hook fails and names the unticked gate

  Scenario: Ticked gate allows commit
    Given the Gate 0 box is ticked and committed
    When I commit "proposal.md"
    Then the commit succeeds

  Scenario: Tool missing
    Given "openspec" or "jq" is not on PATH
    When the end-to-end test runs
    Then it prints a skip message and exits 0

  Scenario: No residue
    When the end-to-end test finishes
    Then its temp directory is removed

  Scenario: Budget
    When "make test-e2e" runs
    Then it completes within 20 seconds with no network access
