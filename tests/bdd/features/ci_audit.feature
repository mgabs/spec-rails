Feature: CI spec-to-code audit understands the openspec/ layout
  As a team using Spec-Rails on OpenSpec
  We want the CI audit to accept OpenSpec changes as spec backing
  So that valid PRs are not rejected by legacy specs/ paths.

  Scenario: OpenSpec change passes audit (REQ-OSA-21)
    Given a PR that changes "src/app.sh" and "openspec/changes/w1-1-x/proposal.md"
    When the spec-to-code audit runs
    Then it exits 0

  Scenario: Living spec edit passes audit (REQ-OSA-21)
    Given a PR that changes "src/app.sh" and "openspec/specs/core/spec.md"
    When the spec-to-code audit runs
    Then it exits 0

  Scenario: Bug report passes audit (REQ-OSA-21)
    Given a PR that changes "src/app.sh" and "docs/bug-reports/2026-01-01-x.md"
    When the spec-to-code audit runs
    Then it exits 0

  Scenario: Legacy specs bug report no longer counts as spec (REQ-OSA-21)
    Given a PR that changes "src/app.sh" and "specs/bug-reports/2026-01-01-x.md"
    When the spec-to-code audit runs
    Then it exits 1

  Scenario: Code without spec fails audit (REQ-OSA-21)
    Given a non-chore PR that changes only "src/app.sh"
    When the spec-to-code audit runs
    Then it exits 1
    And it lists "src/app.sh"

  Scenario: Legacy paths no longer count as spec (REQ-OSA-21)
    Given a PR that changes "src/app.sh" and "specs/features/x/spec.md"
    When the spec-to-code audit runs
    Then it exits 1

  Scenario: Chore lane is exempt (REQ-OSA-21)
    Given a PR from branch "chore/tidy" that changes only "src/app.sh"
    When the spec-to-code audit runs
    Then it exits 0
