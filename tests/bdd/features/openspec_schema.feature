Feature: spec-rails OpenSpec schema
  As a team running OpenSpec
  We want a "spec-rails" schema with a research gate and gate footers
  So that Spec-Rails gates exist as OpenSpec artifacts without a parallel spec lifecycle.

  @REQ-OSA-1
  Scenario: Schema bundle is resolvable by OpenSpec
    Given the shipped bundle "schemas/spec-rails/" with "schema.yaml" and "templates/"
    When it is copied to "openspec/schemas/spec-rails/" in an OpenSpec project
    Then "openspec schemas" lists "spec-rails"

  @REQ-OSA-2
  Scenario: Research is the root artifact and gates proposal
    Given a change using schema "spec-rails" with no "research.md"
    When "openspec status --change <c>" runs
    Then "research" is ready and "proposal" is blocked on "research"

  @REQ-OSA-3
  Scenario: Artifact DAG matches the Spec-Rails gates
    Given the "spec-rails" schema
    Then the artifacts are research, proposal, specs, design, tasks in that dependency order
    And proposal requires research, specs requires proposal, design requires specs, tasks requires design

  @REQ-OSA-4
  Scenario: Planning templates end with an unticked Review Gate, spec.md has none
    Given templates "research.md", "proposal.md", "design.md", "tasks.md" in "schemas/spec-rails/templates/"
    Then each ends with a "## Review Gate" section
    And that section contains one unticked "- [ ]" checkbox naming its gate
    And template "spec.md" contains no "## Review Gate" section

  @REQ-OSA-5
  Scenario: Artifact instructions carry the gate's mandatory sections
    Given the instruction of each artifact in the "spec-rails" schema
    Then research names Options, Tradeoff Matrix and Breaking Changes
    And proposal names Out-of-Scope (YAGNI)
    And design names Pure Core vs I/O Shell

  @REQ-OSA-6
  Scenario: Apply drives the slice loop
    Given the "apply" block of the "spec-rails" schema
    Then it requires "tasks" and tracks "tasks.md"
    And its instruction lists Contract scaffolding, Red, Green, coverage, mutation in order

  @REQ-OSA-10
  Scenario: Feature changes use the lowercased hyphen-normalized roadmap ID
    Given roadmap item "W3.1" with slug "openspec-addon"
    Then the change directory is named "w3-1-openspec-addon"

  @REQ-OSA-4
  Scenario: Malformed templates are rejected
    Given a template missing its "## Review Gate" footer or with a pre-ticked box
    When the template check runs
    Then it fails naming the template
