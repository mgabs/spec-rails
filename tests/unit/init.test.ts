import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { detectStack, initProject, getStackMeta, findPresetsDir, generatePreCommitConfig, findAssetRoot, scaffoldDeveloperGuide } from "../../src/commands/init.js";
import { loadConfigFile } from "../../src/config.js";

describe("Stack Auto-Detection & Init Command", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-rails-init-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("detects TypeScript stack when package.json is present", () => {
    fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
    expect(detectStack(tempDir)).toBe("ts");
  });

  it("detects Python stack when pyproject.toml, requirements.txt, or setup.py is present", () => {
    const py1 = path.join(tempDir, "py1");
    fs.mkdirSync(py1);
    fs.writeFileSync(path.join(py1, "pyproject.toml"), "");
    expect(detectStack(py1)).toBe("python");

    const py2 = path.join(tempDir, "py2");
    fs.mkdirSync(py2);
    fs.writeFileSync(path.join(py2, "requirements.txt"), "");
    expect(detectStack(py2)).toBe("python");

    const py3 = path.join(tempDir, "py3");
    fs.mkdirSync(py3);
    fs.writeFileSync(path.join(py3, "setup.py"), "");
    expect(detectStack(py3)).toBe("python");
  });

  it("detects Go stack when go.mod is present", () => {
    fs.writeFileSync(path.join(tempDir, "go.mod"), "module myapp\ngo 1.22\n");
    expect(detectStack(tempDir)).toBe("go");
  });

  it("detects Rust stack when Cargo.toml is present", () => {
    fs.writeFileSync(path.join(tempDir, "Cargo.toml"), "[package]\nname = \"myapp\"\n");
    expect(detectStack(tempDir)).toBe("rust");
  });

  it("detects Gradle stack when build.gradle.kts, build.gradle, or gradlew is present (REQ-OSA-54)", () => {
    const g1 = path.join(tempDir, "g1");
    fs.mkdirSync(g1);
    fs.writeFileSync(path.join(g1, "build.gradle.kts"), "");
    expect(detectStack(g1)).toBe("gradle");

    const g2 = path.join(tempDir, "g2");
    fs.mkdirSync(g2);
    fs.writeFileSync(path.join(g2, "build.gradle"), "");
    expect(detectStack(g2)).toBe("gradle");

    const g3 = path.join(tempDir, "g3");
    fs.mkdirSync(g3);
    fs.writeFileSync(path.join(g3, "gradlew"), "");
    expect(detectStack(g3)).toBe("gradle");
  });

  it("resolves Gradle test command preferring make test when Makefile defines test: (REQ-OSA-54)", () => {
    expect(getStackMeta("gradle")).toEqual({
      testCommand: "./gradlew test",
    });

    const gMake = path.join(tempDir, "gMake");
    fs.mkdirSync(gMake);
    fs.writeFileSync(path.join(gMake, "Makefile"), ".PHONY: test\ntest:\n\t./gradlew testDebug\n");
    expect(getStackMeta("gradle", gMake)).toEqual({
      testCommand: "make test",
    });
  });

  it("falls back to auto when no recognized manifest is present", () => {
    expect(detectStack(tempDir)).toBe("auto");
  });

  it("returns appropriate stack meta for all stacks", () => {
    expect(getStackMeta("ts")).toEqual({
      testCommand: "npm test",
      coverageCommand: "npm run test:coverage",
      mutationCommand: "npx stryker run",
      presetFile: "stryker.config.json",
    });
    expect(getStackMeta("python")).toEqual({
      testCommand: "pytest",
      coverageCommand: "pytest --cov",
      mutationCommand: "mutmut run",
      presetFile: "mutmut.ini",
    });
    expect(getStackMeta("go")).toEqual({
      testCommand: "go test ./...",
      coverageCommand: "go test -coverprofile=coverage.out ./...",
      mutationCommand: "gremlins unleash",
      presetFile: "gremlins.yaml",
    });
    expect(getStackMeta("rust")).toEqual({
      testCommand: "cargo test",
      coverageCommand: "cargo tarpaulin",
      mutationCommand: "cargo mutants",
      presetFile: "cargo-mutants.toml",
    });
    expect(getStackMeta("auto")).toEqual({
      testCommand: "npm test",
    });
  });

  it("findPresetsDir finds existing directory", () => {
    const dir = findPresetsDir();
    expect(fs.existsSync(dir)).toBe(true);
    expect(fs.existsSync(path.join(dir, "ts", "stryker.config.json"))).toBe(true);
  });

  it("fails fast when openspec directory is missing (REQ-OSA-32)", () => {
    expect(() =>
      initProject({
        cwd: tempDir,
        stack: "ts",
      })
    ).toThrow("OpenSpec repository not detected: 'openspec/' directory is missing. Run 'openspec init' first before running 'spec-rails init'.");
  });

  it("scaffolds developer guide in docs/spec-rails/GUIDE.md (REQ-OSA-32)", () => {
    fs.mkdirSync(path.join(tempDir, "openspec"));
    const result = initProject({
      cwd: tempDir,
      stack: "ts",
    });

    const docsDir = path.join(tempDir, "docs/spec-rails");
    const guideDoc = path.join(docsDir, "GUIDE.md");
    const workflowDoc = path.join(docsDir, "WORKFLOW.md");
    const commandsDoc = path.join(docsDir, "COMMANDS.md");
    const railsDoc = path.join(docsDir, "RAILS.md");

    expect(fs.existsSync(guideDoc)).toBe(true);
    expect(fs.existsSync(workflowDoc)).toBe(false);
    expect(fs.existsSync(commandsDoc)).toBe(true);
    expect(fs.existsSync(railsDoc)).toBe(true);
    expect(fs.readFileSync(guideDoc, "utf-8")).toContain("Spec-Rails Workflow Guide");
    expect(fs.readFileSync(commandsDoc, "utf-8")).toContain("spec-rails init");
    expect(fs.readFileSync(railsDoc, "utf-8")).toContain("95%");
    expect(result.createdFiles).toContain(guideDoc);
    expect(result.createdFiles).toContain(commandsDoc);
    expect(result.createdFiles).toContain(railsDoc);
  });

  it("resolves and copies assets from canonical openspec/ source tree (REQ-OSA-32)", () => {
    fs.mkdirSync(path.join(tempDir, "openspec"));
    initProject({
      cwd: tempDir,
      stack: "ts",
    });

    expect(fs.existsSync(path.join(tempDir, "openspec/schemas/spec-rails/schema.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "openspec/spec-rails/AGENTS.md"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, ".agents/skills/spec-rails/SKILL.md"))).toBe(true);
  });

  it("initializes a TypeScript repository with config and stryker preset", () => {
    fs.mkdirSync(path.join(tempDir, "openspec"));
    fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
    const result = initProject({
      cwd: tempDir,
      stack: "auto",
      force: false,
    });

    expect(result.detectedStack).toBe("ts");
    const configPath = path.join(tempDir, "spec-rails.config.json");
    const strykerPath = path.join(tempDir, "stryker.config.json");
    expect(result.createdFiles).toContain(configPath);
    expect(result.createdFiles).toContain(strykerPath);
    expect(fs.existsSync(configPath)).toBe(true);

    const rawContent = fs.readFileSync(configPath, "utf-8");
    expect(rawContent.endsWith("\n")).toBe(true);
    expect(JSON.parse(rawContent).$schema).toBeUndefined();

    const cfg = loadConfigFile(configPath);
    expect(cfg.stack).toBe("ts");
    expect(cfg.strict).toBe(true);
    expect(cfg.coverageMinScore).toBe(95);
    expect(cfg.mutationMinScore).toBe(95);
    expect(cfg.testCommand).toBe("npm test");
    expect(cfg.coverageCommand).toBe("npm run test:coverage");
    expect(cfg.mutationCommand).toBe("npx stryker run");
  });

  it("initializes a Python repository with config and mutmut preset", () => {
    fs.mkdirSync(path.join(tempDir, "openspec"));
    fs.writeFileSync(path.join(tempDir, "pyproject.toml"), "");
    const result = initProject({
      cwd: tempDir,
      stack: "auto",
      force: false,
    });

    expect(result.detectedStack).toBe("python");
    const configPath = path.join(tempDir, "spec-rails.config.json");
    const mutmutPath = path.join(tempDir, "mutmut.ini");
    expect(result.createdFiles).toContain(configPath);
    expect(result.createdFiles).toContain(mutmutPath);

    const cfg = loadConfigFile(configPath);
    expect(cfg.stack).toBe("python");
    expect(cfg.testCommand).toBe("pytest");
    expect(cfg.coverageCommand).toBe("pytest --cov");
    expect(cfg.mutationCommand).toBe("mutmut run");
  });

  it("initializes a Go repository with config and gremlins preset", () => {
    fs.mkdirSync(path.join(tempDir, "openspec"));
    fs.writeFileSync(path.join(tempDir, "go.mod"), "module myapp\n");
    const result = initProject({
      cwd: tempDir,
      stack: "auto",
      force: false,
    });

    expect(result.detectedStack).toBe("go");
    const configPath = path.join(tempDir, "spec-rails.config.json");
    const gremlinsPath = path.join(tempDir, "gremlins.yaml");
    expect(result.createdFiles).toContain(configPath);
    expect(result.createdFiles).toContain(gremlinsPath);

    const cfg = loadConfigFile(configPath);
    expect(cfg.stack).toBe("go");
    expect(cfg.testCommand).toBe("go test ./...");
    expect(cfg.coverageCommand).toBe("go test -coverprofile=coverage.out ./...");
    expect(cfg.mutationCommand).toBe("gremlins unleash");
  });

  it("initializes a Rust repository with config and cargo-mutants preset", () => {
    fs.mkdirSync(path.join(tempDir, "openspec"));
    fs.writeFileSync(path.join(tempDir, "Cargo.toml"), "[package]\n");
    const result = initProject({
      cwd: tempDir,
      stack: "auto",
      force: false,
    });

    expect(result.detectedStack).toBe("rust");
    const configPath = path.join(tempDir, "spec-rails.config.json");
    const mutantsPath = path.join(tempDir, "cargo-mutants.toml");
    expect(result.createdFiles).toContain(configPath);
    expect(result.createdFiles).toContain(mutantsPath);

    const cfg = loadConfigFile(configPath);
    expect(cfg.stack).toBe("rust");
    expect(cfg.testCommand).toBe("cargo test");
    expect(cfg.coverageCommand).toBe("cargo tarpaulin");
    expect(cfg.mutationCommand).toBe("cargo mutants");
  });

  it("initializes an unrecognized repo with auto stack and no preset file", () => {
    fs.mkdirSync(path.join(tempDir, "openspec"));
    const result = initProject({
      cwd: tempDir,
      stack: "auto",
      force: false,
    });
    expect(result.detectedStack).toBe("auto");
    expect(result.createdFiles.length).toBeGreaterThanOrEqual(1);
    const cfg = loadConfigFile(path.join(tempDir, "spec-rails.config.json"));
    expect(cfg.stack).toBe("auto");
    expect(cfg.testCommand).toBe("npm test");
    expect(cfg.coverageCommand).toBeUndefined();
    expect(cfg.mutationCommand).toBeUndefined();
  });

  it("does not overwrite preset file when already present unless force is true", () => {
    fs.mkdirSync(path.join(tempDir, "openspec"));
    const destPreset = path.join(tempDir, "stryker.config.json");
    fs.writeFileSync(destPreset, "// custom stryker config");

    // Init without force
    const res1 = initProject({
      cwd: tempDir,
      stack: "ts",
      force: false,
    });
    // config was created, but destPreset was NOT pushed to createdFiles because it was skipped
    expect(res1.createdFiles).toContain(path.join(tempDir, "spec-rails.config.json"));
    expect(res1.createdFiles).not.toContain(destPreset);
    expect(fs.readFileSync(destPreset, "utf-8")).toBe("// custom stryker config");

    // Init with force: overwrites preset
    const res2 = initProject({
      cwd: tempDir,
      stack: "ts",
      force: true,
    });
    expect(res2.createdFiles).toContain(path.join(tempDir, "spec-rails.config.json"));
    expect(res2.createdFiles).toContain(destPreset);
    expect(fs.readFileSync(destPreset, "utf-8")).not.toBe("// custom stryker config");
  });

  it("refuses to overwrite existing config unless force is true", () => {
    fs.mkdirSync(path.join(tempDir, "openspec"));
    fs.writeFileSync(path.join(tempDir, "spec-rails.config.json"), "{}");
    expect(() =>
      initProject({
        cwd: tempDir,
        stack: "ts",
        force: false,
      })
    ).toThrow(/already exists/);

    expect(() =>
      initProject({
        cwd: tempDir,
        stack: "ts",
        force: true,
      })
    ).not.toThrow();
  });

  it("finds presets directory using fallback path when dev path does not exist", () => {
    const fakeDistDir = path.join(tempDir, "dist");
    fs.mkdirSync(fakeDistDir, { recursive: true });
    const presetsDir = findPresetsDir(fakeDistDir);
    expect(presetsDir).toBe(path.resolve(fakeDistDir, "../templates/presets"));
  });

  it("finds asset root using dist fallback when dev root does not have openspec/schemas", () => {
    const fakeDistDir = path.join(tempDir, "pkg/dist");
    const fakeDevDir = path.join(tempDir, "pkg");
    fs.mkdirSync(path.join(fakeDevDir, "openspec/schemas/spec-rails"), { recursive: true });
    const root = findAssetRoot(fakeDistDir);
    expect(root).toBe(fakeDevDir);

    // Fallback to devRoot when neither has schemas
    const emptyDir = path.join(tempDir, "empty/sub");
    fs.mkdirSync(emptyDir, { recursive: true });
    const emptyRoot = findAssetRoot(emptyDir);
    expect(emptyRoot).toBe(path.resolve(emptyDir, "../.."));
  });

  it("updates existing schema in openspec/config.yaml", () => {
    const osDir = path.join(tempDir, "openspec");
    fs.mkdirSync(osDir, { recursive: true });
    fs.writeFileSync(path.join(osDir, "config.yaml"), "schema: other\nfoo: bar\n");
    initProject({ cwd: tempDir, stack: "ts" });
    const cfg = fs.readFileSync(path.join(osDir, "config.yaml"), "utf-8");
    expect(cfg).toContain("schema: spec-rails");
  });

  it("generates stack-aware pre-commit configuration (REQ-OSA-46)", () => {
    const pyYaml = generatePreCommitConfig("python", "pytest");
    expect(pyYaml).toContain("id: branch-protection");
    expect(pyYaml).toContain("entry: pytest");
    expect(pyYaml).not.toContain("make test");
    expect(pyYaml).toContain("entry: npx --no-install spec-rails check");
    expect(pyYaml).not.toContain("check-lgtm-directives");
    expect(pyYaml).not.toContain(".lgtm");

    const goYaml = generatePreCommitConfig("go", "go test ./...");
    expect(goYaml).toContain("entry: go test ./...");

    const rustYaml = generatePreCommitConfig("rust", "cargo test");
    expect(rustYaml).toContain("entry: cargo test");

    const tsYaml = generatePreCommitConfig("ts", "npm test");
    expect(tsYaml).toContain("entry: npm test");
  });

  it("package.json is named spec-rails (REQ-OSA-32)", () => {
    const root = findAssetRoot();
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
    expect(pkg.name).toBe("spec-rails");
  });

  it("prunes legacy v0.1 shell scripts and duplicate rails.conf during init (REQ-OSA-32)", () => {
    const osDir = path.join(tempDir, "openspec/spec-rails");
    fs.mkdirSync(osDir, { recursive: true });
    const legacyCheck = path.join(osDir, "spec-rails-check");
    const legacyVerify = path.join(osDir, "spec-rails-verify");
    const legacyConf = path.join(osDir, "rails.conf");
    fs.writeFileSync(legacyCheck, "#!/bin/sh\nexit 0");
    fs.writeFileSync(legacyVerify, "#!/bin/sh\nexit 0");
    fs.writeFileSync(legacyConf, "RAILS_TEST=foo");

    initProject({ cwd: tempDir, stack: "ts" });

    expect(fs.existsSync(legacyCheck)).toBe(false);
    expect(fs.existsSync(legacyVerify)).toBe(false);
    expect(fs.existsSync(legacyConf)).toBe(false);
  });

  it("surgically modernizes existing .pre-commit-config.yaml in-place (REQ-OSA-46)", () => {
    fs.mkdirSync(path.join(tempDir, "openspec"));
    const existingYaml = `repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace

  - repo: local
    hooks:
      - id: check-lgtm-directives
        name: check unresolved lgtm review directives
        entry: >-
          sh -c 'if [ -d .lgtm/reviews ]; then exit 1; fi'
        language: system

      - id: branch-protection
        name: spec-rails branch protection
        entry: sh -c 'exit 0'
        language: system

      - id: spec-rails-check
        name: spec-rails gate and lane check
        entry: sh -c 'if [ -f openspec/spec-rails/spec-rails-check ]; then sh openspec/spec-rails/spec-rails-check; fi'
        language: system

      - id: spec-rails-verify
        name: spec-rails test rails verification
        entry: sh -c 'if [ -f openspec/spec-rails/spec-rails-verify ]; then sh openspec/spec-rails/spec-rails-verify; fi'
        language: system

      - id: detekt
        name: custom android detekt hook
        entry: ./gradlew detekt
        language: system
`;
    const preCommitPath = path.join(tempDir, ".pre-commit-config.yaml");
    fs.writeFileSync(preCommitPath, existingYaml);

    initProject({ cwd: tempDir, stack: "ts" });

    const updatedYaml = fs.readFileSync(preCommitPath, "utf-8");
    expect(updatedYaml).not.toContain("check-lgtm-directives");
    expect(updatedYaml).not.toContain("spec-rails-verify");
    expect(updatedYaml).toContain("entry: npx --no-install spec-rails check");
    expect(updatedYaml).toContain("id: branch-protection");
    expect(updatedYaml).toContain("id: detekt");
    expect(updatedYaml).toContain("./gradlew detekt");
  });

  it("removes pre-commit.legacy and does not write raw git hook script (REQ-OSA-46)", () => {
    const gitHooksDir = path.join(tempDir, ".git/hooks");
    fs.mkdirSync(gitHooksDir, { recursive: true });
    const legacyHook = path.join(gitHooksDir, "pre-commit.legacy");
    fs.writeFileSync(legacyHook, "# old hook");

    // Initialize in a repo with openspec
    fs.mkdirSync(path.join(tempDir, "openspec"));
    initProject({ cwd: tempDir, stack: "python" });

    // Legacy hook must be gone
    expect(fs.existsSync(legacyHook)).toBe(false);
    // Raw git hook must not contain the manual shell script
    const rawHook = path.join(gitHooksDir, "pre-commit");
    if (fs.existsSync(rawHook)) {
      expect(fs.readFileSync(rawHook, "utf-8")).not.toContain("ERROR: Direct commits to '$branch' are forbidden");
    }
  });
});
