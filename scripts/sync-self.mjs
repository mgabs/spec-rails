// Syncs this repo's self-copies from their sources. Never overwrites a drifted file unless --force.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const force = process.argv.includes("--force");
const PAIRS = [
  ["schemas/spec-rails", "openspec/schemas/spec-rails"],
  ["rules/AGENTS.md", "openspec/spec-rails/AGENTS.md"],
  ["rules/WORKFLOW.md", "openspec/spec-rails/WORKFLOW.md"],
  ["templates/bug-report.md", "openspec/spec-rails/bug-report.md"],
  ["skills/spec-rails/SKILL.md", ".agents/skills/spec-rails/SKILL.md"],
];

function files(rel) {
  const full = path.join(root, rel);
  if (!fs.statSync(full).isDirectory()) return [rel];
  return fs.readdirSync(full).flatMap((name) => files(path.join(rel, name)));
}

let drifted = 0;
for (const [src, dest] of PAIRS) {
  for (const file of files(src)) {
    const target = path.join(dest, path.relative(src, file));
    const from = path.join(root, file);
    const to = path.join(root, target);
    const exists = fs.existsSync(to);
    if (exists && fs.readFileSync(from).equals(fs.readFileSync(to))) continue;
    if (exists && !force) {
      console.log(`drifted (kept): ${target}`);
      drifted++;
      continue;
    }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    console.log(`${exists ? "updated" : "created"}: ${target}`);
  }
}
if (drifted > 0) {
  console.log(`${drifted} drifted file(s) kept; review them, then run: npm run sync:self -- --force`);
  process.exitCode = 1;
}
