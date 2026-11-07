@REQ-OSA-47
Feature: Strict mutation rail and timeout execution

  Scenario: Mutation output missing score fails
    Given a configured mutation command exits 0 and prints "no score was reported"
    And the changeset includes source files
    When I run spec-rails verify
    Then verification fails reporting that the mutation score is missing

  Scenario: Mutation score below threshold fails
    Given a configured mutation command exits 0 and prints "Mutation score: 90%"
    And the configured mutation threshold is 95%
    And the changeset includes source files
    When I run spec-rails verify
    Then verification fails reporting that the mutation score is below the configured threshold

  Scenario: Successful mutation score passes
    Given a configured mutation command exits 0 and prints "Mutation score: 96%"
    And the configured mutation threshold is 95%
    And the changeset includes source files
    When I run spec-rails verify
    Then the mutation rail passes

  Scenario: Mutation command reports non-zero failure
    Given a configured mutation command exits 1 and prints "mutation error"
    And the changeset includes source files
    When I run spec-rails verify
    Then verification fails and includes "mutation error"

  Scenario: Command execution timeout
    Given a configured command exceeds the execution timeout
    When I run spec-rails verify
    Then verification fails reporting a command timeout

  Scenario: Coverage below its configured threshold still fails
    Given a coverage command exits 0 and prints "coverage 90%"
    And the configured coverage threshold is 95%
    When I run spec-rails verify
    Then verification fails because coverage is below its threshold

  Scenario: Docs-only changes skip mutation
    Given a changeset contains only documentation files
    And no test files match the configured globs
    When I run spec-rails verify
    Then the mutation command is not executed
    And the absence of matching test files does not fail verification

  Scenario: Mutation task evidence keeps its configured threshold
    Given a completed task has mutation evidence of 96%
    And the configured mutation evidence threshold is 98%
    When I run spec-rails verify
    Then verification fails because the task evidence is below its threshold
