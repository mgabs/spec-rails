import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("REQ-OSA-49 CI and hook templates", () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, "../..", rel), "utf-8");

  it("CI template is an inert skeleton without spec-rails or openspec invocations (REQ-OSA-49)", () => {
    const ci = read("templates/spec-rails-ci.yml");
    expect(ci).not.toMatch(/\b(spec-rails|openspec)\s+(check|verify|audit|init)\b/);
    expect(ci).not.toMatch(/npm (install|i) .*openspec/);
    expect(ci).not.toContain("make test");
    expect(ci).toContain("# - name: Unit tests");
    expect(ci).toContain("# - name: Coverage");
    expect(ci).toContain("# - name: Mutation testing");
  });

  it("pre-commit template carries no check or verify hook (REQ-OSA-46)", () => {
    expect(read("templates/.pre-commit-config.yaml")).not.toMatch(/spec-rails-(check|verify)|spec-rails (check|verify)/);
  });
});

describe("REQ-OSA-50 docs", () => {
  it("documents skill names and commit guidance", () => {
    const doc = fs.readFileSync(path.join(__dirname, "../../docs/agentic-how-tos/05-configure-ai-agents.md"), "utf-8");
    expect(doc).toContain("openspec-");
    expect(doc).toContain("commit `.agents/`, `.claude/`");
  });
});

describe("docs describe the single init command (REQ-OSA-32)", () => {
  const root = path.join(__dirname, "../..");
  const agentic = fs.readdirSync(path.join(root, "docs/agentic-how-tos")).map((f) => `docs/agentic-how-tos/${f}`);
  const files = ["README.md", "docs/WAY_OF_WORKING.md", "docs/WIKI.md", "docs/agentic-how-tos/05-configure-ai-agents.md", ...agentic, "rules/AGENTS.md", "rules/WORKFLOW.md", "skills/spec-rails/SKILL.md", "templates/TODO.md"];
  it("lists all five agentic runbooks and the index", () => {
    expect(agentic.map((f) => path.basename(f))).toEqual([
      "01-bootstrap-new-project.md",
      "02-drive-feature-lifecycle.md",
      "03-parallel-worktrees-multi-agent.md",
      "04-fast-track-bugfix.md",
      "05-configure-ai-agents.md",
      "README.md",
    ]);
  });

  it("agentic docs link only to sibling runbooks", () => {
    for (const f of agentic) {
      const links = [...fs.readFileSync(path.join(root, f), "utf-8").matchAll(/\]\((?!https?:)([^)#]+)/g)].map((m) => m[1]);
      for (const l of links) expect(l, f).toMatch(/^[\w-]+\.md$/);
    }
  });

  it("mentions no removed commands, flags or config files", () => {
    for (const f of files) {
      const text = fs.readFileSync(path.join(root, f), "utf-8");
      expect(text, f).not.toMatch(/spec-rails (check|verify|audit)\b|spec-rails-(check|verify)|--stack|spec-rails\.config\.json|mutation presets/);
      expect(text, f).not.toMatch(/init [^\n]*--force/);
    }
  });
});

describe("shipped rules state the process requirements (REQ-OSA-7, REQ-OSA-8, REQ-OSA-10, REQ-OSA-19, REQ-OSA-33, REQ-OSA-34, REQ-OSA-35)", () => {
  const root = path.join(__dirname, "../..");
  const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf-8");
  const workflow = read("rules/WORKFLOW.md");
  const schema = read("schemas/spec-rails/schema.yaml");
  const agents = read("rules/AGENTS.md");

  it("REQ-OSA-7: feature specs are OpenSpec deltas under the change", () => {
    expect(workflow).toContain("openspec/changes/<id>-<slug>/specs/<capability>/spec.md");
    expect(workflow).toContain("pure OpenSpec delta specs");
  });

  it("REQ-OSA-8: requirement headers start with the stable key", () => {
    expect(workflow).toContain("### Requirement: REQ-<DOMAIN>-<N> <name>");
    expect(schema).toContain("### Requirement: REQ-<DOMAIN>-<N> <Name>");
  });

  it("REQ-OSA-10: change ids are lowercased with dots as hyphens", () => {
    expect(workflow).toMatch(/lowercased with dots normalized to hyphens/);
    expect(workflow).toContain("w1-2-");
  });

  it("REQ-OSA-19: streams rebase onto the feature branch and run openspec validate", () => {
    expect(workflow).toMatch(/after rebasing a stream onto the feature branch, run `openspec validate <change>`/);
  });

  it("REQ-OSA-33: contract scaffolding precedes slice code", () => {
    for (const text of [workflow, agents, read("skills/spec-rails/SKILL.md")]) expect(text).toMatch(/Contract Scaffolding/i);
    expect(schema).toMatch(/Contract scaffolding: commit interfaces/);
  });

  it("REQ-OSA-34: reviewer must understand every line or delete it", () => {
    for (const text of [workflow, agents]) expect(text).toMatch(/Understand or Delete/);
    expect(workflow).toMatch(/cannot explain every line of the diff, delete and revert/);
  });

  it("REQ-OSA-35: bake-off is optional and uses cand worktrees", () => {
    expect(workflow).toContain(".worktrees/<id>-cand-a");
    expect(workflow).toContain(".worktrees/<id>-cand-b");
    expect(workflow).toMatch(/strictly optional/);
  });
});

describe("repository layout and bundle (REQ-OSA-20, REQ-OSA-45, NFR-OSA-4)", () => {
  const root = path.join(__dirname, "../..");

  it("REQ-OSA-20: no specs/ directory and docs describe the openspec/ layout", () => {
    expect(fs.existsSync(path.join(root, "specs"))).toBe(false);
    expect(fs.readFileSync(path.join(root, "rules/WORKFLOW.md"), "utf-8")).toContain("openspec/specs/<capability>/spec.md");
  });

  it("REQ-OSA-45: no shell binaries and no jq in the sources or package", () => {
    expect(fs.existsSync(path.join(root, "bin"))).toBe(false);
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
    expect(pkg.bin).toEqual({ "spec-rails": "./dist/cli.js" });
    for (const f of fs.readdirSync(path.join(root, "src"), { recursive: true, withFileTypes: true })) {
      if (f.isFile()) expect(fs.readFileSync(path.join(f.parentPath, f.name), "utf-8"), f.name).not.toMatch(/\bjq\b/);
    }
  });

  it("NFR-OSA-4: the executable is a Node entry point with no OS restriction", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
    expect(pkg.os).toBeUndefined();
    expect(fs.readFileSync(path.join(root, "tsup.config.ts"), "utf-8")).toMatch(/#!\/usr\/bin\/env node/);
  });
});
