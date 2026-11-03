@REQ-OSA-23 @REQ-OSA-24 @REQ-OSA-30 @NFR-OSA-7
Feature: Hygiene lint for docs links and unused shell helpers
  As a Spec-Rails maintainer
  We want make test-lint to catch broken doc links and dead shell functions
  So that docs and scripts do not rot after refactors.

  Scenario: Broken link detected (REQ-OSA-23)
    Given "docs/a.md" links to "missing.md" which does not exist
    When the hygiene check runs
    Then it exits non-zero
    And it names "docs/a.md" and "missing.md"

  Scenario: Unused helper detected (REQ-OSA-24)
    Given "tests/x.sh" defines "orphan()" and never calls it
    When the hygiene check runs
    Then it exits non-zero
    And it names "tests/x.sh" and "orphan"

  Scenario: Clean tree passes (REQ-OSA-23, 24)
    Given all relative links resolve and every function is used
    When the hygiene check runs
    Then it exits 0

  Scenario: Manual template copy is rejected (REQ-OSA-23)
    Given "docs/b.md" contains "cp openspec/schemas/spec-rails/templates/research.md"
    When the hygiene check runs
    Then it exits non-zero naming "docs/b.md"

  Scenario: Lint budget (NFR-OSA-7)
    Given the repository tree
    When the hygiene check runs
    Then it completes within 2 seconds
