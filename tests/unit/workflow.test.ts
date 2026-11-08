import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { initProject } from "../../src/commands/init.js";

const cleanEnv: NodeJS.ProcessEnv = { ...process.env };
delete cleanEnv.GIT_DIR;
delete cleanEnv.GIT_WORK_TREE;
delete cleanEnv.GIT_INDEX_FILE;
delete cleanEnv.GIT_OBJECT_DIRECTORY;
delete cleanEnv.GIT_ALTERNATE_OBJECT_DIRECTORIES;

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf-8",
    env: cleanEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

describe("Spec-Rails Workflow Lifecycle (REQ-OSA-1, REQ-OSA-3, REQ-OSA-9, REQ-OSA-12)", () => {
  let testDir: string;

  beforeAll(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-rails-workflow-test-"));
    git(["init", "-b", "main"], testDir);
    git(["config", "user.name", "Test Dev"], testDir);
    git(["config", "user.email", "dev@example.com"], testDir);

    fs.writeFileSync(path.join(testDir, "README.md"), "# Test Repo\n");
    git(["add", "README.md"], testDir);
    git(["commit", "--no-verify", "-m", "initial commit"], testDir);

    return () => {
      fs.rmSync(testDir, { recursive: true, force: true });
    };
  });

  it("Scenario 1: Bootstraps an OpenSpec repository with Spec-Rails wiring", () => {
    fs.mkdirSync(path.join(testDir, "openspec"), { recursive: true });
    const result = initProject({ cwd: testDir, stack: "ts" });
    expect(result.detectedStack).toBe("ts");
    expect(result.createdFiles.length).toBeGreaterThan(0);

    expect(fs.existsSync(path.join(testDir, "openspec/schemas/spec-rails/schema.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(testDir, "openspec/spec-rails/AGENTS.md"))).toBe(true);
    expect(fs.existsSync(path.join(testDir, "openspec/spec-rails/WORKFLOW.md"))).toBe(true);
    expect(fs.existsSync(path.join(testDir, ".github/workflows/spec-rails-ci.yml"))).toBe(true);
    expect(fs.existsSync(path.join(testDir, ".pre-commit-config.yaml"))).toBe(true);

    const configYaml = fs.readFileSync(path.join(testDir, "openspec/config.yaml"), "utf-8");
    expect(configYaml).toContain("schema: spec-rails");

    const gitignore = fs.readFileSync(path.join(testDir, ".gitignore"), "utf-8");
    expect(gitignore).toContain(".worktrees/");

    git(["add", "."], testDir);
    git(["commit", "--no-verify", "-m", "chore: bootstrap Spec-Rails"], testDir);
  });

  it("Scenario 2: Feature Gate 0 Go advances through Gates 1-4 and archives cleanly", () => {
    git(["checkout", "-b", "feat/w1-1-core-contracts"], testDir);

    const changeDir = path.join(testDir, "openspec/changes/w1-1-core-contracts");
    fs.mkdirSync(changeDir, { recursive: true });

    // Gate 0 Research
    fs.writeFileSync(
      path.join(changeDir, "research.md"),
      "# Research\n## Review Gate\n- [x] **Gate 0 Decision**: Go (Option A)\n"
    );
    git(["add", "openspec/changes/w1-1-core-contracts/research.md"], testDir);
    git(["commit", "--no-verify", "-m", "docs(w1-1): Gate 0 research - Option A chosen"], testDir);

    // Gate 1 Proposal
    fs.writeFileSync(
      path.join(changeDir, "proposal.md"),
      "# Proposal\n## Review Gate\n- [x] **Gate 1 Approval**: Approved\n"
    );

    // Gate 2 Delta Spec (pure OpenSpec delta, no review gate footer)
    const specDir = path.join(changeDir, "specs/contracts");
    fs.mkdirSync(specDir, { recursive: true });
    fs.writeFileSync(
      path.join(specDir, "spec.md"),
      "# Spec Delta\n## Purpose\nDeterministic token validation.\n## ADDED Requirements\n### Requirement: REQ-CONTRACT-1 Deterministic validation\nThe system MUST validate tokens.\n#### Scenario: Valid token\n- **GIVEN** token\n- **WHEN** validate runs\n- **THEN** passes\n"
    );

    // Gate 2 Architecture & Design
    fs.writeFileSync(
      path.join(changeDir, "design.md"),
      "# Architecture & Technical Design\n## Review Gate\n- [x] **Gate 2 Approval**: Architecture & specs approved\n"
    );

    // Gate 3 Tasks & DAG
    fs.writeFileSync(
      path.join(changeDir, "tasks.md"),
      "# Tasks\n## 3. Slice 1: Token Validation\n- [x] 3.1 Contract scaffolding\n- [x] 3.2 Red tests\n- [x] 3.3 Green implementation\n## Review Gate\n- [x] **Gate 3 Approval**: Tasks breakdown approved\n"
    );

    // Code & Test implementation
    const srcDir = path.join(testDir, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, "contracts.ts"),
      "export function validateToken(t: string): boolean { return t.trim().length > 0; }\n"
    );

    git(["add", "."], testDir);
    git(["commit", "--no-verify", "-m", "feat(w1-1): implement verified token contracts"], testDir);

    // Gate 4 Archive: simulate openspec archive by promoting specs and archiving change
    const livingSpecDir = path.join(testDir, "openspec/specs/contracts");
    fs.mkdirSync(livingSpecDir, { recursive: true });
    fs.writeFileSync(
      path.join(livingSpecDir, "spec.md"),
      fs.readFileSync(path.join(specDir, "spec.md"), "utf-8")
    );
    const archiveDir = path.join(testDir, "openspec/changes/archive/w1-1-core-contracts");
    fs.mkdirSync(path.dirname(archiveDir), { recursive: true });
    fs.renameSync(changeDir, archiveDir);

    git(["add", "-A"], testDir);
    git(["commit", "--no-verify", "-m", "chore(w1-1): sync specs and archive change"], testDir);

    git(["checkout", "main"], testDir);
    git(["merge", "--ff-only", "feat/w1-1-core-contracts"], testDir);
    git(["branch", "-d", "feat/w1-1-core-contracts"], testDir);

    expect(fs.existsSync(path.join(testDir, "openspec/specs/contracts/spec.md"))).toBe(true);
    expect(fs.existsSync(path.join(testDir, "openspec/changes/archive/w1-1-core-contracts/research.md"))).toBe(true);
    expect(fs.existsSync(path.join(testDir, "src/contracts.ts"))).toBe(true);
  });

  it("Scenario 3: Feature Gate 0 No-Go archives negative research without dirtying code", () => {
    git(["checkout", "-b", "feat/w1-2-unfeasible"], testDir);

    const changeDir = path.join(testDir, "openspec/changes/w1-2-unfeasible");
    fs.mkdirSync(changeDir, { recursive: true });
    const researchFile = path.join(changeDir, "research.md");
    fs.writeFileSync(
      researchFile,
      "# Research\n## Review Gate\n- [x] **Gate 0 Decision**: No-Go (Latency prohibitive)\n"
    );

    git(["add", "."], testDir);
    git(["commit", "--no-verify", "-m", "docs(w1-2): Gate 0 research concludes No-Go"], testDir);

    const negativeResearchContent = fs.readFileSync(researchFile, "utf-8");

    // No-Go protocol: archive research to main, delete feature branch
    git(["checkout", "main"], testDir);
    const archiveDir = path.join(testDir, "openspec/changes/archive/w1-2-unfeasible");
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.writeFileSync(path.join(archiveDir, "research.md"), negativeResearchContent);

    git(["add", "."], testDir);
    git(["commit", "--no-verify", "-m", "chore: archive W1.2 research as No-Go"], testDir);
    git(["branch", "-D", "feat/w1-2-unfeasible"], testDir);

    expect(fs.existsSync(path.join(testDir, "openspec/changes/archive/w1-2-unfeasible/research.md"))).toBe(true);
    expect(fs.existsSync(path.join(testDir, "openspec/changes/w1-2-unfeasible"))).toBe(false);
  });

  it("Scenario 4: Chore lane merges zero-behavior-change commits without gates", () => {
    git(["checkout", "-b", "chore/update-docs"], testDir);

    fs.appendFileSync(path.join(testDir, "README.md"), "\n## Operational Notes\n");
    git(["add", "README.md"], testDir);
    git(["commit", "--no-verify", "-m", "docs: add operational notes"], testDir);

    git(["checkout", "main"], testDir);
    git(["merge", "--ff-only", "chore/update-docs"], testDir);
    git(["branch", "-d", "chore/update-docs"], testDir);

    const readme = fs.readFileSync(path.join(testDir, "README.md"), "utf-8");
    expect(readme).toContain("Operational Notes");
  });

  it("Scenario 5: Fast-track bugfix reproduces defect red-first in worktree and merges cleanly", () => {
    const worktreeDir = path.join(testDir, ".worktrees/fix-whitespace-token");
    fs.mkdirSync(path.join(testDir, ".worktrees"), { recursive: true });

    git(["worktree", "add", worktreeDir, "-b", "fix/whitespace-token", "main"], testDir);

    // Gate B1: Bug report inside worktree
    const bugDir = path.join(worktreeDir, "docs/bug-reports");
    fs.mkdirSync(bugDir, { recursive: true });
    fs.writeFileSync(path.join(bugDir, "whitespace-bug.md"), "# Bug Report: Whitespace tokens accepted\n");

    // Gate B2 & B3: Fix code and update living spec
    fs.writeFileSync(
      path.join(worktreeDir, "src/contracts.ts"),
      "export function validateToken(t: string): boolean { return t.trim().length > 0 && !/^\\s+$/.test(t); }\n"
    );

    fs.appendFileSync(
      path.join(worktreeDir, "openspec/specs/contracts/spec.md"),
      "\n### Requirement: REQ-CONTRACT-2 Whitespace rejection\nTokens with only whitespace MUST be rejected.\n"
    );

    git(["add", "."], worktreeDir);
    git(["commit", "--no-verify", "-m", "fix: reject whitespace-only tokens"], worktreeDir);

    git(["checkout", "main"], testDir);
    git(["merge", "--ff-only", "fix/whitespace-token"], testDir);

    git(["worktree", "remove", worktreeDir], testDir);
    git(["branch", "-d", "fix/whitespace-token"], testDir);
    git(["worktree", "prune"], testDir);

    expect(fs.existsSync(path.join(testDir, "docs/bug-reports/whitespace-bug.md"))).toBe(true);
    const livingSpec = fs.readFileSync(path.join(testDir, "openspec/specs/contracts/spec.md"), "utf-8");
    expect(livingSpec).toContain("REQ-CONTRACT-2");
  });
});
