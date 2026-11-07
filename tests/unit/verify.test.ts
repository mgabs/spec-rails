import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";
import {
  defaultExec,
  detectChangedFiles,
  discoverTests,
  verifyTraceability,
  runVerify,
  extractDeltaSpecKeys,
} from "../../src/commands/verify.js";

vi.mock("node:child_process", async (importOriginal) => ({
  ...await importOriginal<typeof import("node:child_process")>(),
  spawnSync: vi.fn(),
}));

describe("verify", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-rails-verify-test-"));
  });

  afterEach(() => {
    vi.mocked(spawnSync).mockReset();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("process helpers", () => {
    it("uses safe defaults when command spawning fails", () => {
      vi.mocked(spawnSync).mockReturnValue({
        pid: 0,
        output: [],
        stdout: "",
        stderr: "",
        status: null,
        signal: null,
      });

      expect(defaultExec("missing-command", tmpDir)).toEqual({ status: 1, output: "" });
    });

    it("preserves command output from stdout and stderr", () => {
      vi.mocked(spawnSync).mockReturnValue({
        pid: 0,
        output: [],
        stdout: "stdout",
        stderr: "stderr",
        status: 0,
        signal: null,
      });

      expect(defaultExec("command", tmpDir)).toEqual({ status: 0, output: "stdoutstderr" });
    });

    it("returns null when git cannot detect changed files", () => {
      vi.mocked(spawnSync).mockReturnValue({
        pid: 0,
        output: [],
        stdout: "",
        stderr: "",
        status: 1,
        signal: null,
      });

      expect(detectChangedFiles(tmpDir)).toBeNull();
    });

    it("returns changed paths when git diff succeeds", () => {
      vi.mocked(spawnSync).mockReturnValue({
        pid: 0,
        output: [],
        stdout: "src/app.ts\nREADME.md\n",
        stderr: "",
        status: 0,
        signal: null,
      });

      expect(detectChangedFiles(tmpDir)).toEqual(["src/app.ts", "README.md"]);
    });
  });

  describe("extractDeltaSpecKeys", () => {
    it("extracts requirement keys under ADDED and MODIFIED Requirements sections", () => {
      const specMd = `
# Delta Spec
### Requirement: REQ-BEFORE-1 Ignored Before Section

## ADDED Requirements
### Requirement: REQ-OSA-10 New Feature
Description here.
### Requirement: NFR-OSA-20 Fast Perf
Performance notes.

## MODIFIED Requirements
### Requirement: REQ-OSA-30 Updated Feature

## Review Gate
### Requirement: REQ-OSA-99 Ignored Gate Requirement
`;
      const keys = extractDeltaSpecKeys(specMd);
      expect(keys).toEqual(["REQ-OSA-10", "NFR-OSA-20", "REQ-OSA-30"]);
    });

    it("ignores requirements inside indented markdown code fences", () => {
      const specMd = `
## ADDED Requirements
   \`\`\`markdown
   ### Requirement: REQ-OSA-FAKE-1 Fake in backticks
   \`\`\`
   ~~~markdown
   ### Requirement: REQ-OSA-FAKE-2 Fake in tildes
   ~~~
### Requirement: REQ-OSA-REAL-1 Real
`;
      const keys = extractDeltaSpecKeys(specMd);
      expect(keys).toEqual(["REQ-OSA-REAL-1"]);
    });

    it("returns empty array when no ADDED or MODIFIED sections exist", () => {
      const specMd = "# Overview\nNo requirement headings here.";
      expect(extractDeltaSpecKeys(specMd)).toEqual([]);
    });
  });

  describe("discoverTests", () => {
    it("finds tests according to configured globs across directories and co-located files", () => {
      fs.mkdirSync(path.join(tmpDir, "src/pkg"), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, "tests/unit"), { recursive: true });

      fs.writeFileSync(path.join(tmpDir, "src/pkg/calc.go"), "package pkg");
      fs.writeFileSync(path.join(tmpDir, "src/pkg/calc_test.go"), "package pkg // test");
      fs.writeFileSync(path.join(tmpDir, "tests/unit/app.test.ts"), "// test");

      // Files in ignored directories should not be discovered
      fs.mkdirSync(path.join(tmpDir, "node_modules/dep"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "node_modules/dep/dep.test.ts"), "// test");
      fs.mkdirSync(path.join(tmpDir, "dist"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "dist/bundle.test.ts"), "// test");

      const foundGo = discoverTests(tmpDir, ["**/*_test.go"]);
      expect(foundGo).toHaveLength(1);
      expect(foundGo[0]).toContain("calc_test.go");

      const foundAll = discoverTests(tmpDir, ["**/*.test.ts"]);
      expect(foundAll).toHaveLength(1);
      expect(foundAll[0]).toContain("app.test.ts");
      expect(foundAll.some((f) => f.includes("node_modules"))).toBe(false);
      expect(foundAll.some((f) => f.includes("dist"))).toBe(false);
    });

    it("returns empty array when no files match globs", () => {
      const found = discoverTests(tmpDir, ["**/*.spec.ts"]);
      expect(found).toHaveLength(0);
    });
  });

  describe("verifyTraceability", () => {
    it("passes when all spec keys are present across multiple test files", () => {
      const testFile1 = path.join(tmpDir, "sample1.test.ts");
      fs.writeFileSync(testFile1, "// only @REQ-OSA-36 is here");

      const testFile2 = path.join(tmpDir, "sample2.test.ts");
      fs.writeFileSync(testFile2, "// and @REQ-OSA-37 is here");

      const res = verifyTraceability([testFile1, testFile2], ["REQ-OSA-36", "REQ-OSA-37"]);
      expect(res.valid).toBe(true);
      expect(res.missing).toHaveLength(0);
    });

    it("fails when a spec key is missing from all test files", () => {
      const testFile = path.join(tmpDir, "sample.test.ts");
      fs.writeFileSync(testFile, "// @REQ-OSA-36 is here");

      const res = verifyTraceability([testFile], ["REQ-OSA-36", "REQ-OSA-38"]);
      expect(res.valid).toBe(false);
      expect(res.missing).toEqual(["REQ-OSA-38"]);
    });

    it("handles unreadable test file gracefully", () => {
      const nonExistentFile = path.join(tmpDir, "does-not-exist.test.ts");
      const res = verifyTraceability([nonExistentFile], ["REQ-OSA-36"]);
      expect(res.valid).toBe(false);
      expect(res.missing).toEqual(["REQ-OSA-36"]);
    });

    it("passes trivially when no delta spec keys are provided", () => {
      const res = verifyTraceability([], []);
      expect(res.valid).toBe(true);
      expect(res.missing).toHaveLength(0);
    });
  });

  describe("runVerify", () => {
    // REQ-OSA-47: mutation commands own their threshold
    describe("mutation command exit status", () => {
      beforeEach(() => {
        fs.writeFileSync(
          path.join(tmpDir, "spec-rails.config.json"),
          JSON.stringify({
            testCommand: "test",
            coverageCommand: "coverage",
            coverageMinScore: 95,
            mutationCommand: "mutation",
            mutationMinScore: 98,
            strict: false,
          })
        );
      });

      it.each(["progress 20%", "no score was reported"])(
        "accepts a successful mutation command with output %s",
        (output) => {
          const result = runVerify({
            cwd: tmpDir,
            runCommands: true,
            changedFiles: ["src/app.ts"],
            exec: (command: string) => ({
              status: 0,
              output: command === "mutation" ? output : "coverage 100%",
            }),
          });
          expect(result.errors).toEqual([]);
        }
      );

      it("reports a failed mutation command and its output", () => {
        const result = runVerify({
          cwd: tmpDir,
          runCommands: true,
          changedFiles: ["src/app.ts"],
          exec: (command: string) =>
            command === "mutation"
              ? { status: 1, output: "mutation threshold missed" }
              : { status: 0, output: "coverage 100%" },
        });
        expect(result.errors).toContain(
          "mutation command failed (exit 1): mutation\nmutation threshold missed"
        );
      });

      it("still rejects coverage below its threshold", () => {
        const result = runVerify({
          cwd: tmpDir,
          runCommands: true,
          changedFiles: ["src/app.ts"],
          exec: (command: string) => ({
            status: 0,
            output: command === "coverage" ? "coverage 90%" : "",
          }),
        });
        expect(result.errors).toContain("coverage score 90% is below threshold 95%");
      });
    });

    it("successfully validates compliant repository", () => {
      // Setup spec-rails.config.json
      fs.writeFileSync(
        path.join(tmpDir, "spec-rails.config.json"),
        JSON.stringify({
          stack: "ts",
          testGlobs: ["tests/**/*.test.ts"],
          testCommand: "npm test",
          strict: true,
        })
      );

      // Setup tests
      fs.mkdirSync(path.join(tmpDir, "tests"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "tests/sample.test.ts"),
        "// test @REQ-OSA-36"
      );

      // Setup openspec changes
      const changeDir = path.join(tmpDir, "openspec/changes/c1");
      fs.mkdirSync(path.join(changeDir, "specs"), { recursive: true });
      fs.writeFileSync(
        path.join(changeDir, "specs/spec.md"),
        "## ADDED Requirements\n\n### Requirement: REQ-OSA-36 Presets\n"
      );
      fs.writeFileSync(
        path.join(changeDir, "tasks.md"),
        "- [x] 1.1 Green implementation Evidence: [CMD: npm test] [EXIT: 0]\n- [x] 1.2 Coverage & Mutation Evidence: [CMD: npm run test:coverage] [EXIT: 0] [COVERAGE: 95%] [MUTATION: 95%]\n"
      );

      const result = runVerify({ cwd: tmpDir, strict: true });
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.discoveredTests).toHaveLength(1);
    });

    it("uses default testGlobs and passes when no config file exists and tests match default globs", () => {
      fs.mkdirSync(path.join(tmpDir, "tests"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "tests/sample.test.ts"), "// test");

      const result = runVerify({ cwd: tmpDir });
      expect(result.success).toBe(true);
      expect(result.discoveredTests).toHaveLength(1);
    });

    it("loads an explicit config using the process working directory when cwd is omitted", () => {
      fs.writeFileSync(
        path.join(tmpDir, "spec-rails.config.json"),
        JSON.stringify({
          testGlobs: ["tests/**/*.test.ts"],
          testCommand: "npm test",
          strict: false,
        })
      );
      const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmpDir);

      try {
        const result = runVerify({ configPath: path.join(tmpDir, "spec-rails.config.json") });
        expect(result.success).toBe(true);
      } finally {
        cwdSpy.mockRestore();
      }
    });

    it("fails when test files are missing in strict mode", () => {
      fs.writeFileSync(
        path.join(tmpDir, "spec-rails.config.json"),
        JSON.stringify({
          stack: "ts",
          testGlobs: ["tests/**/*.test.ts"],
          testCommand: "npm test",
          strict: true,
        })
      );

      const result = runVerify({ cwd: tmpDir, strict: true });
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => /no test files found/i.test(e))).toBe(true);
    });

    it("fails when tasks.md contains substandard evidence score with custom config threshold", () => {
      fs.writeFileSync(
        path.join(tmpDir, "spec-rails.config.json"),
        JSON.stringify({
          stack: "ts",
          testGlobs: ["tests/**/*.test.ts"],
          testCommand: "npm test",
          strict: true,
          mutationMinScore: 98,
        })
      );

      fs.mkdirSync(path.join(tmpDir, "tests"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "tests/sample.test.ts"), "// test");

      const changeDir = path.join(tmpDir, "openspec/changes/c1");
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(
        path.join(changeDir, "tasks.md"),
        "- [x] 1.1 Mutation rail Evidence: [CMD: npx stryker run] [EXIT: 0] [MUTATION: 96%]\n"
      );

      const result = runVerify({ cwd: tmpDir, strict: true });
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => /mutation score 96%/i.test(e))).toBe(true);
    });

    it("handles invalid config file JSON", () => {
      fs.writeFileSync(path.join(tmpDir, "spec-rails.config.json"), "{ invalid json");
      const result = runVerify({ cwd: tmpDir });
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => /failed to load config/i.test(e))).toBe(true);
    });

    it("allows zero test files when strict is false", () => {
      fs.writeFileSync(
        path.join(tmpDir, "spec-rails.config.json"),
        JSON.stringify({
          stack: "ts",
          testGlobs: ["tests/**/*.test.ts"],
          testCommand: "npm test",
          strict: true,
        })
      );
      // Explicit options.strict = false overrides config.strict = true
      const result = runVerify({ cwd: tmpDir, strict: false });
      expect(result.success).toBe(true);
      expect(result.discoveredTests).toHaveLength(0);
    });

    it("flags missing evidence in tasks.md during runVerify", () => {
      fs.writeFileSync(
        path.join(tmpDir, "spec-rails.config.json"),
        JSON.stringify({
          stack: "ts",
          testGlobs: ["tests/**/*.test.ts"],
          testCommand: "npm test",
        })
      );
      fs.mkdirSync(path.join(tmpDir, "tests"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "tests/sample.test.ts"), "// test");

      const changeDir = path.join(tmpDir, "openspec/changes/c1");
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(
        path.join(changeDir, "tasks.md"),
        "- [x] 1.1 Green implementation without evidence\n"
      );

      const result = runVerify({ cwd: tmpDir });
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => /missing evidence/i.test(e))).toBe(true);
    });

    it("skips archive directory and non-directory files without --change option", () => {
      fs.writeFileSync(
        path.join(tmpDir, "spec-rails.config.json"),
        JSON.stringify({
          stack: "ts",
          testGlobs: ["tests/**/*.test.ts"],
          testCommand: "npm test",
        })
      );

      fs.mkdirSync(path.join(tmpDir, "tests"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "tests/sample.test.ts"), "// test @REQ-OSA-36");

      // Valid change c1
      const c1Dir = path.join(tmpDir, "openspec/changes/c1");
      fs.mkdirSync(path.join(c1Dir, "specs"), { recursive: true });
      fs.writeFileSync(
        path.join(c1Dir, "specs/spec.md"),
        "## ADDED Requirements\n\n### Requirement: REQ-OSA-36 Presets\n"
      );
      fs.writeFileSync(
        path.join(c1Dir, "tasks.md"),
        "- [x] 1.1 Rail Evidence: [CMD: npm test] [EXIT: 0]\n"
      );

      // Archive directory contains broken tasks.md; must be skipped!
      fs.mkdirSync(path.join(tmpDir, "openspec/changes/archive"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "openspec/changes/archive/tasks.md"),
        "- [x] 1.1 Broken archive rail Evidence: [CMD: false] [EXIT: 1]\n"
      );

      // Non-directory file in openspec/changes
      fs.writeFileSync(path.join(tmpDir, "openspec/changes/README.md"), "# Changes");

      // Run verify without change option: processes c1, skips archive and README.md
      const result = runVerify({ cwd: tmpDir });
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("filters changes with --change option and flags uncovered requirement traceability error", () => {
      fs.writeFileSync(
        path.join(tmpDir, "spec-rails.config.json"),
        JSON.stringify({
          stack: "ts",
          testGlobs: ["tests/**/*.test.ts"],
          testCommand: "npm test",
        })
      );

      fs.mkdirSync(path.join(tmpDir, "tests"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "tests/sample.test.ts"), "// test without keys");

      // Archive directory contains broken tasks.md; should be skipped completely!
      fs.mkdirSync(path.join(tmpDir, "openspec/changes/archive"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "openspec/changes/archive/tasks.md"),
        "- [x] 1.1 Broken archive rail Evidence: [CMD: false] [EXIT: 1]\n"
      );

      // Non-directory file in openspec/changes (should be ignored)
      fs.writeFileSync(path.join(tmpDir, "openspec/changes/README.md"), "# Changes");

      // Change without specs directory (should be handled cleanly without crashing)
      fs.mkdirSync(path.join(tmpDir, "openspec/changes/c_nospecs"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, "openspec/changes/c_nospecs/tasks.md"),
        "- [x] 1.1 Clean rail Evidence: [CMD: npm test] [EXIT: 0]\n"
      );

      // Change 1 (target)
      const c1Dir = path.join(tmpDir, "openspec/changes/c1");
      fs.mkdirSync(path.join(c1Dir, "specs"), { recursive: true });
      fs.writeFileSync(
        path.join(c1Dir, "specs/spec.md"),
        "## ADDED Requirements\n\n### Requirement: REQ-OSA-99 MissingKey\n"
      );

      // Change 2 (ignored because change option specifies c1)
      const c2Dir = path.join(tmpDir, "openspec/changes/c2");
      fs.mkdirSync(path.join(c2Dir, "specs"), { recursive: true });
      fs.writeFileSync(
        path.join(c2Dir, "specs/spec.md"),
        "## ADDED Requirements\n\n### Requirement: REQ-OSA-100 OtherMissing\n"
      );

      const result = runVerify({ cwd: tmpDir, change: "c1" });
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => /REQ-OSA-99/i.test(e))).toBe(true);
      expect(result.errors.some((e) => /REQ-OSA-100/i.test(e))).toBe(false);
      expect(result.errors.some((e) => /archive/i.test(e))).toBe(false);
    });
  });
});
