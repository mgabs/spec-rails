import { describe, it, expect, vi } from "vitest";
import { execFileSync } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { createCli, runCli } from "../../src/cli.js";

describe("CLI Binary Integration & Unit", () => {
  const cliPath = path.resolve("dist/cli.js");

  it("registers expected commands in createCli", () => {
    const cli = createCli();
    const commandNames = cli.commands.map((c) => c.name);
    expect(commandNames).toContain("init");
    expect(commandNames).toContain("verify");
    expect(commandNames).toContain("lint");
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
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    cli.parse(["node", "spec-rails", "verify", "--strict"]);
    expect(logSpy).toHaveBeenCalledWith("[spec-rails] verify called (strict=true)");
    logSpy.mockRestore();
  });

  it("invokes lint command handler", () => {
    const cli = createCli();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    cli.parse(["node", "spec-rails", "lint", "--gate=2"]);
    expect(logSpy).toHaveBeenCalledWith("[spec-rails] lint called for gate=2");
    logSpy.mockRestore();
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
