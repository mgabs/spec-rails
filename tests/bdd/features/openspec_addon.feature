@REQ-OSA-7 @REQ-OSA-8 @REQ-OSA-9 @REQ-OSA-19 @REQ-OSA-20 @REQ-OSA-29 @REQ-OSA-30 @REQ-OSA-31 @REQ-OSA-32 @REQ-OSA-33 @REQ-OSA-34 @REQ-OSA-35 @NFR-OSA-1 @NFR-OSA-4 @NFR-OSA-5
Feature: Spec-Rails OpenSpec addon architecture, layout, and boundary hardening
  As an engineering team running Spec-Rails on OpenSpec v1.15/v1.16+
  We want OpenSpec-native delta specs, archival, layout, and hardened CLI/gate/rail boundaries
  So that specifications, agent skills, checks, and shell scripts remain portable and tamper-resistant.

  @REQ-OSA-7
  Scenario: Feature specs are OpenSpec delta specs
    Given an active feature change "w4-1-demo"
    When capability specifications are authored at Gate 2
    Then they live as delta specs under "openspec/changes/w4-1-demo/specs/<capability>/spec.md"

  @REQ-OSA-8
  Scenario: Delta requirement headers begin with unique stable keys
    Given a delta specification requirement
    Then its header begins with "### Requirement: REQ-<DOMAIN>-<N> <Name>" or "### Requirement: NFR-<DOMAIN>-<N> <Name>"
    And retired keys are never reused

  @REQ-OSA-9
  Scenario: Gate 6 uses openspec archive for spec sync and archival
    Given a completed feature change passing all rails and "openspec validate"
    When Gate 6 executes
    Then "openspec archive <change> --yes" syncs deltas into "openspec/specs/" and archives the change with no Spec-Rails copy step

  @REQ-OSA-19
  Scenario: Parallel stream merge discipline requires rebase and openspec validate
    Given a parallel worktree stream merging into its parent feature branch
    Then "openspec/spec-rails/WORKFLOW.md" requires rebasing onto the feature branch and passing "openspec validate <change>"

  @REQ-OSA-20 @REQ-OSA-29 @REQ-OSA-30
  Scenario: Self-migrated layout with shipped protocol and docs data paths
    Given the Spec-Rails repository tree
    Then there is no top-level "specs/" directory
    And "openspec/spec-rails/WORKFLOW.md" is shipped and referenced by "openspec/spec-rails/AGENTS.md"
    And delivery status lives in "docs/ROADMAP.md" and bug reports in "docs/bug-reports/" with zero legacy "specs/" references

  @REQ-OSA-31
  Scenario: Hardened OpenSpec v1.15/v1.16 store boundary and transitive gate DAG check
    Given an OpenSpec v1.15 or v1.16 project with transitive artifact dependencies or store configuration
    When "spec-rails-check" inspects active changes
    Then every unapproved ancestor gate in the DAG is flagged and OpenSpec JSON/store boundaries are respected

  @REQ-OSA-32
  Scenario: Hardened verifier, skill installation, and self-copy synchronization
    Given an OpenSpec project wired with "bin/spec-rails"
    Then ".agents/skills/spec-rails/SKILL.md" is installed idempotently
    And "spec-rails-verify" enforces requirement traceability, task evidence, and configured rail commands cleanly

  @NFR-OSA-1 @NFR-OSA-4 @NFR-OSA-5
  Scenario: POSIX portability, minimal dependencies, and testing rails on addon scripts
    Given the shell scripts in "bin/" and "tests/"
    When validated with POSIX "sh -n" and the test suite on macOS and Linux default shells
    Then they require only POSIX utilities, "git", "jq", and "openspec"
    And installer and check scripts maintain >= 95% line/branch coverage and > 90% mutant kill

  @REQ-OSA-33
  Scenario: Contract scaffolding precedes implementation
    Given a planned vertical slice
    When tasks are dispatched to an implementation agent
    Then domain types, interface contracts, and function signatures are already committed

  @REQ-OSA-34
  Scenario: Human comprehension verification at Gate 6
    Given an AI-generated implementation diff
    When the human reviewer inspects the code at Gate 6
    Then every line must be understood or the diff is deleted and reverted

  @REQ-OSA-35
  Scenario: Optional candidate bake-off in parallel worktrees
    Given a high-uncertainty algorithmic task
    When a team runs a parallel candidate bake-off in ".worktrees/<id>-cand-a" and "cand-b"
    Then the candidate passing rails with lowest diff complexity merges and losers are pruned

  @NFR-OSA-5
  Scenario: Surviving mutants are justified above the 90% floor
    Given a mutation run on core logic scoring above 90%
    When surviving mutants remain
    Then each survivor is listed in the PR as an equivalent mutant or accepted risk
