import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { detectStack, initProject, getStackMeta, findPresetsDir } from "../../src/commands/init.js";
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

  it("initializes a TypeScript repository with config and stryker preset", () => {
    fs.writeFileSync(path.join(tempDir, "package.json"), "{}");
    const result = initProject({
      cwd: tempDir,
      stack: "auto",
      force: false,
    });

    expect(result.detectedStack).toBe("ts");
    const configPath = path.join(tempDir, "spec-rails.config.json");
    const strykerPath = path.join(tempDir, "stryker.config.json");
    expect(result.createdFiles).toEqual([configPath, strykerPath]);
    expect(fs.existsSync(configPath)).toBe(true);

    const rawContent = fs.readFileSync(configPath, "utf-8");
    expect(rawContent.endsWith("\n")).toBe(true);
    expect(JSON.parse(rawContent).$schema).toBe(
      "https://raw.githubusercontent.com/openspec/spec-rails/main/schemas/spec-rails.schema.json"
    );

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
    fs.writeFileSync(path.join(tempDir, "pyproject.toml"), "");
    const result = initProject({
      cwd: tempDir,
      stack: "auto",
      force: false,
    });

    expect(result.detectedStack).toBe("python");
    const configPath = path.join(tempDir, "spec-rails.config.json");
    const mutmutPath = path.join(tempDir, "mutmut.ini");
    expect(result.createdFiles).toEqual([configPath, mutmutPath]);

    const cfg = loadConfigFile(configPath);
    expect(cfg.stack).toBe("python");
    expect(cfg.testCommand).toBe("pytest");
    expect(cfg.coverageCommand).toBe("pytest --cov");
    expect(cfg.mutationCommand).toBe("mutmut run");
  });

  it("initializes a Go repository with config and gremlins preset", () => {
    fs.writeFileSync(path.join(tempDir, "go.mod"), "module myapp\n");
    const result = initProject({
      cwd: tempDir,
      stack: "auto",
      force: false,
    });

    expect(result.detectedStack).toBe("go");
    const configPath = path.join(tempDir, "spec-rails.config.json");
    const gremlinsPath = path.join(tempDir, "gremlins.yaml");
    expect(result.createdFiles).toEqual([configPath, gremlinsPath]);

    const cfg = loadConfigFile(configPath);
    expect(cfg.stack).toBe("go");
    expect(cfg.testCommand).toBe("go test ./...");
    expect(cfg.coverageCommand).toBe("go test -coverprofile=coverage.out ./...");
    expect(cfg.mutationCommand).toBe("gremlins unleash");
  });

  it("initializes a Rust repository with config and cargo-mutants preset", () => {
    fs.writeFileSync(path.join(tempDir, "Cargo.toml"), "[package]\n");
    const result = initProject({
      cwd: tempDir,
      stack: "auto",
      force: false,
    });

    expect(result.detectedStack).toBe("rust");
    const configPath = path.join(tempDir, "spec-rails.config.json");
    const mutantsPath = path.join(tempDir, "cargo-mutants.toml");
    expect(result.createdFiles).toEqual([configPath, mutantsPath]);

    const cfg = loadConfigFile(configPath);
    expect(cfg.stack).toBe("rust");
    expect(cfg.testCommand).toBe("cargo test");
    expect(cfg.coverageCommand).toBe("cargo tarpaulin");
    expect(cfg.mutationCommand).toBe("cargo mutants");
  });

  it("initializes an unrecognized repo with auto stack and no preset file", () => {
    const result = initProject({
      cwd: tempDir,
      stack: "auto",
      force: false,
    });
    expect(result.detectedStack).toBe("auto");
    expect(result.createdFiles.length).toBe(1);
    const cfg = loadConfigFile(path.join(tempDir, "spec-rails.config.json"));
    expect(cfg.stack).toBe("auto");
    expect(cfg.testCommand).toBe("npm test");
    expect(cfg.coverageCommand).toBeUndefined();
    expect(cfg.mutationCommand).toBeUndefined();
  });

  it("does not overwrite preset file when already present unless force is true", () => {
    const destPreset = path.join(tempDir, "stryker.config.json");
    fs.writeFileSync(destPreset, "// custom stryker config");

    // Init without force
    const res1 = initProject({
      cwd: tempDir,
      stack: "ts",
      force: false,
    });
    // config was created, but destPreset was NOT pushed to createdFiles because it was skipped
    expect(res1.createdFiles).toEqual([path.join(tempDir, "spec-rails.config.json")]);
    expect(fs.readFileSync(destPreset, "utf-8")).toBe("// custom stryker config");

    // Init with force: overwrites preset
    const res2 = initProject({
      cwd: tempDir,
      stack: "ts",
      force: true,
    });
    expect(res2.createdFiles).toEqual([path.join(tempDir, "spec-rails.config.json"), destPreset]);
    expect(fs.readFileSync(destPreset, "utf-8")).not.toBe("// custom stryker config");
  });

  it("refuses to overwrite existing config unless force is true", () => {
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
});
