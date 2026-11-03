@REQ-OSA-26 @REQ-OSA-27 @REQ-OSA-28 @NFR-OSA-9
Feature: CI verifies the test rails without language-specific tooling
  REQ-OSA-26, REQ-OSA-27, REQ-OSA-28, NFR-OSA-9

  Scenario: Covered key passes
    Given an active delta spec declares "REQ-X-1"
    And a ".feature" file under "tests/" contains "REQ-X-1"
    When I run "spec-rails-verify"
    Then it reports the key as covered and exits 0

  Scenario: Uncovered key fails
    Given a declared key appears in no test file
    When I run "spec-rails-verify"
    Then it exits non-zero and prints that key

  Scenario: No active changes
    Given there are no active changes
    When I run "spec-rails-verify"
    Then traceability is skipped and it exits 0

  Scenario: Ticked task without evidence
    Given a ticked task says "Red unit tests fail" with no "Evidence:" text
    When I run "spec-rails-verify"
    Then it exits non-zero and names the task

  Scenario: Ticked task with evidence
    Given the ticked task ends with "Evidence: make test -> 3 failed"
    When I run "spec-rails-verify"
    Then the task passes

  Scenario: Unticked task ignored
    Given the task is "- [ ]" with no evidence
    When I run "spec-rails-verify"
    Then the task is not reported

  Scenario: Command fails
    Given "RAILS_COVERAGE" exits 1
    When I run "spec-rails-verify"
    Then it exits non-zero and names "RAILS_COVERAGE"

  Scenario: Undefined commands
    Given "rails.conf" is absent or defines no commands
    When I run "spec-rails-verify"
    Then it warns per undefined command and exits 0

  Scenario: CI only
    When the installer runs
    Then the CI workflow contains a "spec-rails-verify" step
    And the installed git hook does not call it

  Scenario: Existing config preserved
    Given a project whose "rails.conf" was edited
    When the installer runs
    Then the file is unchanged

  Scenario: Own-check budget
    Given no commands are configured
    When I run "spec-rails-verify"
    Then it completes within 5 seconds
