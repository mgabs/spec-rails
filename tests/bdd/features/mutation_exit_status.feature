@REQ-OSA-47
Feature: Mutation verification uses the command's exit status

  Scenario Outline: Successful mutation output is not interpreted as a score
    Given a configured mutation command exits 0 and prints "<output>"
    And the changeset includes source files
    When I run spec-rails verify
    Then the mutation rail passes without interpreting the output

    Examples:
      | output                 |
      | progress 20%           |
      | no score was reported  |

  Scenario: Mutation command reports a missed threshold
    Given a configured mutation command exits 1 and prints "mutation threshold missed"
    And the changeset includes source files
    When I run spec-rails verify
    Then verification fails and includes "mutation threshold missed"

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
