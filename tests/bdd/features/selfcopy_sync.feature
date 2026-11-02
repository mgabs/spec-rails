@REQ-OSA-22 @NFR-OSA-6
Feature: Installed self-copies stay in sync with their sources
  As a Spec-Rails maintainer
  We want the test suite to fail when an installed copy drifts from its source
  So that dogfooded files under openspec/ never silently diverge.

  Scenario: Drift detected (REQ-OSA-22)
    Given "schemas/spec-rails/schema.yaml" differs from "openspec/schemas/spec-rails/schema.yaml"
    When the self-copy sync test runs
    Then it exits non-zero
    And it names "openspec/schemas/spec-rails/schema.yaml"

  Scenario: Installed copy missing (REQ-OSA-22)
    Given "openspec/spec-rails/spec-rails-check" does not exist
    When the self-copy sync test runs
    Then it exits non-zero
    And it names "openspec/spec-rails/spec-rails-check"

  Scenario: Everything in sync (REQ-OSA-22)
    Given every source and installed copy are byte-identical
    When the self-copy sync test runs
    Then it exits 0

  Scenario: Sync check budget (NFR-OSA-6)
    Given every source and installed copy are byte-identical
    When the self-copy sync test runs
    Then it completes within 2 seconds
