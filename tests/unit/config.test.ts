import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { parseConfig, loadConfigFile, getDefaultTestGlobs, loadLegacyRailsConf, loadConfig } from "../../src/config.js";

describe("ConfigSchema & parseConfig", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-rails-cfg-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("parses valid config with default values when stack is omitted", () => {
    const raw = {
      testCommand: "npm test",
    };
    const parsed = parseConfig(raw);
    expect(parsed.stack).toBe("auto");
    expect(parsed.strict).toBe(true);
    expect(parsed.coverageMinScore).toBe(95);
    expect(parsed.mutationMinScore).toBe(95);
    expect(parsed.testGlobs).toEqual(["tests/**", "src/**/*.test.*", "**/*_test.*"]);
  });

  it("parses valid config with default values", () => {
    const raw = {
      stack: "ts",
      testCommand: "npm test",
    };
    const parsed = parseConfig(raw);
    expect(parsed.stack).toBe("ts");
    expect(parsed.strict).toBe(true);
    expect(parsed.coverageMinScore).toBe(95);
    expect(parsed.mutationMinScore).toBe(95);
    expect(parsed.testGlobs).toEqual(["src/**/*.test.ts", "tests/**/*.spec.ts"]);
  });

  it("returns appropriate default globs for each stack", () => {
    expect(getDefaultTestGlobs("ts")).toEqual(["src/**/*.test.ts", "tests/**/*.spec.ts"]);
    expect(getDefaultTestGlobs("python")).toEqual(["tests/**/test_*.py", "**/test_*.py"]);
    expect(getDefaultTestGlobs("go")).toEqual(["**/*_test.go"]);
    expect(getDefaultTestGlobs("rust")).toEqual(["tests/**/*.rs", "src/**/*.rs"]);
    expect(getDefaultTestGlobs("auto")).toEqual(["tests/**", "src/**/*.test.*", "**/*_test.*"]);
  });

  it("accepts custom thresholds and test globs", () => {
    const raw = {
      stack: "python",
      strict: false,
      testGlobs: ["tests/**/test_*.py"],
      testCommand: "pytest",
      coverageCommand: "pytest --cov",
      coverageMinScore: 96,
      mutationCommand: "mutmut run",
      mutationMinScore: 95,
    };
    const parsed = parseConfig(raw);
    expect(parsed.stack).toBe("python");
    expect(parsed.strict).toBe(false);
    expect(parsed.coverageMinScore).toBe(96);
    expect(parsed.testGlobs).toEqual(["tests/**/test_*.py"]);
  });

  it("loads and parses config file with UTF-8 characters", () => {
    const cfgPath = path.join(tempDir, "spec-rails.config.json");
    fs.writeFileSync(
      cfgPath,
      JSON.stringify({
        stack: "rust",
        testCommand: "cargo test -- unicode-rocket-🚀",
      }),
      "utf-8"
    );
    const loaded = loadConfigFile(cfgPath);
    expect(loaded.stack).toBe("rust");
    expect(loaded.testCommand).toContain("🚀");
  });

  it("throws when config file does not exist", () => {
    const missingPath = path.join(tempDir, "missing.json");
    expect(() => loadConfigFile(missingPath)).toThrow(/Configuration file not found/);
  });

  it("populates default test globs when testGlobs is empty array", () => {
    const raw = {
      stack: "ts",
      testCommand: "npm test",
      testGlobs: [],
    };
    const parsed = parseConfig(raw);
    expect(parsed.testGlobs).toEqual(["src/**/*.test.ts", "tests/**/*.spec.ts"]);
  });

  it("parses auto, go, and rust stacks", () => {
    expect(parseConfig({ stack: "auto", testCommand: "test" }).stack).toBe("auto");
    expect(parseConfig({ stack: "go", testCommand: "go test" }).stack).toBe("go");
    expect(parseConfig({ stack: "rust", testCommand: "cargo test" }).stack).toBe("rust");
  });

  it("rejects empty testCommand with exact validation error", () => {
    const raw = {
      stack: "ts",
      testCommand: "",
    };
    expect(() => parseConfig(raw)).toThrow(/testCommand cannot be empty/);
  });

  it("rejects invalid stack name", () => {
    const raw = {
      stack: "invalid-stack",
      testCommand: "test",
    };
    expect(() => parseConfig(raw)).toThrow();
  });

  it("rejects invalid threshold outside 0-100", () => {
    const raw = {
      stack: "ts",
      testCommand: "npm test",
      coverageMinScore: 105,
    };
    expect(() => parseConfig(raw)).toThrow();
  });
});

describe("Legacy rails.conf fallback (REQ-OSA-44)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-rails-legacy-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("parses key-values from rails.conf", () => {
    const railsConf = path.join(tempDir, "rails.conf");
    fs.writeFileSync(
      railsConf,
      `RAILS_TEST_DIRS="tests src"
RAILS_TEST="pytest"
RAILS_COVERAGE="pytest --cov"
RAILS_MUTATION="mutmut run"
`
    );

    const parsed = loadLegacyRailsConf(railsConf);
    expect(parsed?.testCommand).toBe("pytest");
    expect(parsed?.coverageCommand).toBe("pytest --cov");
    expect(parsed?.mutationCommand).toBe("mutmut run");
  });

  it("falls back to openspec/spec-rails/rails.conf when spec-rails.config.json is absent", () => {
    const specRailsDir = path.join(tempDir, "openspec/spec-rails");
    fs.mkdirSync(specRailsDir, { recursive: true });
    fs.writeFileSync(
      path.join(specRailsDir, "rails.conf"),
      `RAILS_TEST="cargo test"`
    );

    const config = loadConfig(tempDir);
    expect(config.testCommand).toBe("cargo test");
  });
});
