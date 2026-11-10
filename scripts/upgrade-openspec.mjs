#!/usr/bin/env node
// Maintainer-only: regenerate vendor/openspec/<version>/ from upstream OpenSpec.
// Never imported by src/ and never run from `init`.
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const TOOLS = "agents,github-copilot,claude";
const SKILL_ROOTS = [".agents/skills", ".claude/skills", ".github/skills"];
const SEMVER = /^\d+\.\d+\.\d+$/;

export function upgrade({ version, root, npx, out = console.log, err = console.error }) {
  if (!SEMVER.test(version)) {
    err("usage: upgrade-openspec.mjs <x.y.z>");
    return 2;
  }
  const vendorDir = join(root, "vendor", "openspec");
  const work = mkdtempSync(join(root, ".upgrade-"));
  try {
    const run = spawnSync(
      npx,
      ["--yes", `@fission-ai/openspec@${version}`, "init", "--tools", TOOLS, "--no-copilot-cloud", "--no-animation", work],
      { cwd: work },
    );
    if (run.error || run.status !== 0) {
      err(`fetch/generate failed for ${version}: ${run.error?.message ?? run.stderr}`);
      return 1;
    }
    const stage = join(work, "snapshot");
    for (const rel of SKILL_ROOTS) {
      if (existsSync(join(work, rel))) cpSync(join(work, rel), join(stage, rel), { recursive: true });
    }
    if (!existsSync(stage)) {
      err(`OpenSpec ${version} generated no skills; nothing changed`);
      return 1;
    }

    // vendor/openspec holds at most one version directory (REQ-POS-3)
    const old = existsSync(vendorDir) ? readdirSync(vendorDir) : [];
    if (old.length) {
      const diff = spawnSync("diff", ["-ru", join(vendorDir, old[0]), stage], { encoding: "utf8" });
      out(diff.stdout || `No upstream skill changes versus ${old[0]}.`);
    } else {
      out(`No previous snapshot; created vendor/openspec/${version}.`);
    }

    for (const name of old) rmSync(join(vendorDir, name), { recursive: true });
    mkdirSync(vendorDir, { recursive: true });
    renameSync(stage, join(vendorDir, version));
    writeFileSync(join(root, "openspec-version"), `${version}\n`);
    return 0;
  } finally {
    rmSync(work, { recursive: true });
  }
}

export function main(argv, env, root) {
  return upgrade({ version: argv[2], root, npx: env.SPEC_RAILS_NPX || "npx" });
}

// Stryker disable all: process entry guard, exercised only by running the script
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv, process.env, resolve(fileURLToPath(import.meta.url), "..", "..")));
}
// Stryker restore all
