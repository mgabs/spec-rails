import { describe, it, expect, vi } from "vitest";
import { execFileSync } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { createCli, runCli } from "../../src/cli.js";

describe("CLI Binary Integration & Unit (REQ-OSA-32, REQ-OSA-45)", () => {
  const cliPath = path.resolve("dist/cli.js");

  it("registers expected commands in createCli", () => {
    const cli = createCli();
    const commandNames = cli.commands.map((c) => c.name);
    expect(commandNames).toEqual(["init", "verify", "check", "audit"]);
    expect(commandNames).not.toContain("lint");
    const verifyCmd = cli.commands.find((c) => c.name === "verify");
    expect(verifyCmd?.options.some((o) => o.name === "slice")).toBe(false);
  });

  it("invokes audit command handler", () => {
    const cli = createCli();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-audit-test-"));

    const cleanEnv = { ...process.env };
    delete cleanEnv.GIT_DIR;
    delete cleanEnv.GIT_WORK_TREE;
    delete cleanEnv.GIT_INDEX_FILE;
    delete cleanEnv.GIT_OBJECT_DIRECTORY;
    delete cleanEnv.GIT_ALTERNATE_OBJECT_DIRECTORIES;

    try {
      execFileSync("git", ["init", "-b", "main"], { cwd: tempDir, stdio: "ignore", env: cleanEnv });
      execFileSync("git", ["config", "user.name", "Spec-Rails Test"], { cwd: tempDir, env: cleanEnv });
      execFileSync("git", ["config", "user.email", "spec-rails-test@example.com"], { cwd: tempDir, env: cleanEnv });
      fs.writeFileSync(path.join(tempDir, "README.md"), "test\n");
      execFileSync("git", ["add", "README.md"], { cwd: tempDir, env: cleanEnv });
      execFileSync("git", ["commit", "--no-verify", "--quiet", "-m", "test"], { cwd: tempDir, env: cleanEnv });

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      try {
        cli.parse(["node", "spec-rails", "audit", tempDir, "--base=main"]);
        expect(logSpy).toHaveBeenCalledWith("[spec-rails] Spec-to-code audit passed.");
      } finally {
        logSpy.mockRestore();
      }
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("invokes init command handler", () => {
    const cli = createCli();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-init-test-"));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    cli.parse(["node", "spec-rails", "init", tempDir, "--stack=python"]);
    expect(logSpy).toHaveBeenCalledWith("[spec-rails] Initialized repository for stack: python");
    logSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("invokes verify command handler", () => {
    const cli = createCli();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-verify-test-"));
    fs.mkdirSync(path.join(tempDir, "tests"), { recursive: true });
    fs.writeFileSync(path.join(tempDir, "tests/dummy.test.ts"), "// test");
    fs.writeFileSync(path.join(tempDir, "spec-rails.config.json"), JSON.stringify({ testCommand: "true" }));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    cli.parse(["node", "spec-rails", "verify", tempDir, "--strict=false"]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("[spec-rails] Verification"));
    logSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("handles verify failure with exit(1)", () => {
    const cli = createCli();
    const emptyTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-verify-fail-"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null | undefined): never => {
      throw new Error(`exit:${code}`);
    });

    expect(() => {
      cli.parse(["node", "spec-rails", "verify", emptyTempDir, "--strict"]);
    }).toThrow("exit:1");

    expect(errSpy).toHaveBeenCalledWith("[spec-rails] Verification failed:");
    errSpy.mockRestore();
    exitSpy.mockRestore();
    fs.rmSync(emptyTempDir, { recursive: true, force: true });
  });

  it("handles runCli exception with exit(1)", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-err-test-"));
    fs.writeFileSync(path.join(tempDir, "spec-rails.config.json"), "{}");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null | undefined): never => {
      throw new Error(`exit:${code}`);
    });

    expect(() => {
      // init will throw because spec-rails.config.json already exists without --force
      runCli(["node", "spec-rails", "init", tempDir]);
    }).toThrow("exit:1");

    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("[spec-rails error]"));
    errSpy.mockRestore();
    exitSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("runs runCli with provided argv", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-runcli-test-"));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    runCli(["node", "spec-rails", "init", tempDir]);
    expect(logSpy).toHaveBeenCalledWith("[spec-rails] Initialized repository for stack: auto");
    logSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("prints version on --version in subprocess bundle", () => {
    const out = execFileSync(process.execPath, [cliPath, "--version"], { encoding: "utf-8" });
    expect(out).toContain("0.2.0");
  });

  it("prints help on --help in subprocess bundle", () => {
    const out = execFileSync(process.execPath, [cliPath, "--help"], { encoding: "utf-8" });
    expect(out).toContain("Usage:");
  });
});
