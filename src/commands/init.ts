import * as fs from "node:fs";
import * as path from "node:path";
import { execSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export type ActionKind = "created" | "updated" | "removed" | "skipped";
export interface Action {
  kind: ActionKind;
  path: string;
  content?: string;
  note?: string;
}

export interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}
export type Runner = (cmd: string, args: string[], opts: { cwd: string }) => RunResult;

export interface InitOptions {
  cwd?: string;
  tools?: string;
  run?: Runner;
}

export interface InitResult {
  actions: Action[];
}

export interface Snapshot {
  files: Record<string, string>;
  legacy: string[];
}

export interface Assets {
  managed: Record<string, string>;
  todo: string;
  ci: string;
  makefile: string;
}

export interface Plan {
  actions: Action[];
  writes: Record<string, string>;
  removals: string[];
}

// Ownership table (design §1): managed files are refreshed, owned files are created or surgically edited,
// legacy files are deleted.
export const MANAGED_SOURCES: ReadonlyArray<{ src: string; dest: string }> = [
  { src: "schemas/spec-rails", dest: "openspec/schemas/spec-rails" },
  { src: "rules/WORKFLOW.md", dest: "openspec/spec-rails/WORKFLOW.md" },
  { src: "rules/AGENTS.md", dest: "openspec/spec-rails/AGENTS.md" },
  { src: "templates/bug-report.md", dest: "openspec/spec-rails/bug-report.md" },
  { src: "skills/spec-rails/SKILL.md", dest: ".agents/skills/spec-rails/SKILL.md" },
  { src: "docs/agentic-how-tos", dest: "docs/agentic-how-tos" },
];
export const OWNED = {
  config: "openspec/config.yaml",
  todo: "openspec/spec-rails/TODO.md",
  makefile: "Makefile",
  preCommit: ".pre-commit-config.yaml",
  ci: ".github/workflows/spec-rails-ci.yml",
  gitignore: ".gitignore",
} as const;
export const LEGACY_PATHS: readonly string[] = [
  "spec-rails.config.json",
  "rails.conf",
  "mutmut.ini",
  "openspec/spec-rails/rails.conf",
  "openspec/spec-rails/spec-rails-check",
  "openspec/spec-rails/spec-rails-verify",
  "openspec/spec-rails/mutation",
  "docs/spec-rails/WORKFLOW.md",
];
export const LEGACY_SKILL_DIR = ".github/skills";
export const LEGACY_SKILL_PREFIX = "opsx-";
const DEFAULT_TOOLS = "agents";

export function findAssetRoot(currentDir: string = path.dirname(fileURLToPath(import.meta.url))): string {
  const devRoot = path.resolve(currentDir, "../..");
  if (fs.existsSync(path.join(devRoot, "schemas/spec-rails"))) {
    return devRoot;
  }
  const distRoot = path.resolve(currentDir, "..");
  if (fs.existsSync(path.join(distRoot, "schemas/spec-rails"))) {
    return distRoot;
  }
  return devRoot;
}

export function developerGuideDocs(): Record<string, string> {
  const guide = `# Spec-Rails Workflow Guide

## Lanes
- **Feature Lane (\`feat/<id>-<slug>\`)**: Gated feature progression (Gates 0 → 4).
- **Bugfix Lane (\`fix/<slug>\`)**: Zero-contamination bug isolation with red test reproduction (Gates B1 → B3).
- **Chore Lane (\`chore/<slug>\`)**: Zero behavior change tasks (docs, maintenance).

## Sequential Gate Enforcement
- **Gate 0**: Research & Options Matrix
- **Gate 1**: Proposal & Intent
- **Gate 2**: Architecture Design & Living Spec Delta
- **Gate 3**: Tasks DAG Breakdown & Red-Green-Refactor Plan
- **Gate 4**: Verification & Evidence Check
- **Gate 5 / 6**: Stream Merges & Final Delivery

Direct commits to \`main\` or \`master\` are strictly blocked by branch protection.
`;

  const commands = `# Spec-Rails CLI Commands

## Commands

### \`spec-rails init\`
Set up Spec-Rails in a repository. When \`openspec/\` is absent it first runs the pinned local \`openspec init\`; re-running is safe and changes nothing once the repository is converged.
\`\`\`bash
spec-rails init [dir] [--tools <list>]
\`\`\`
- \`--tools\`: comma-separated tool list forwarded to \`openspec init --tools\` (default \`agents\`).
`;

  const rails = `# Spec-Rails Testing Rails

## Minimum Thresholds
- **Coverage**: $\\ge 95%$ line / branch coverage.
- **Mutation Kill Score**: $\\ge 95%$ mutation score.

Wire the tools of your stack into your own test command, pre-commit hooks and CI; see \`openspec/spec-rails/TODO.md\`.
`;
  return {
    "docs/spec-rails/GUIDE.md": guide,
    "docs/spec-rails/COMMANDS.md": commands,
    "docs/spec-rails/RAILS.md": rails,
  };
}

const indentOf = (line: string): number => line.length - line.trimStart().length;

export function removeHookBlock(yaml: string, hookId: string): string {
  const lines = yaml.split("\n");
  const start = lines.findIndex((l) => new RegExp(`^[ \\t]*-[ \\t]+id:[ \\t]+${hookId}\\b`).test(l));
  if (start === -1) return yaml;
  const marker = indentOf(lines[start]);
  let end = start + 1;
  while (end < lines.length && indentOf(lines[end]) > marker) end++;
  const from = lines[start - 1] === "" ? start - 1 : start;
  lines.splice(from, end - from);
  return lines.join("\n");
}

export function modernizePreCommitConfig(content: string): string {
  let updated = content;
  for (const id of ["check-lgtm-directives", "spec-rails-verify", "spec-rails-check"]) {
    updated = removeHookBlock(updated, id);
  }
  return updated;
}

export function isStaleWorkflow(content: string): boolean {
  return /\b(spec-rails|openspec)\s+(check|verify|audit|init|validate|status|list|archive|new|instructions|update)\b|openspec\/spec-rails\/spec-rails-|dist\/cli\.js\s+(check|verify|audit)\b/.test(
    content
  );
}

const makeHook = (id: string, name: string): string => `
      - id: ${id}
        name: ${name}
        entry: make ${id}
        language: system
        pass_filenames: false
`;

// An existing Makefile without a target gets no hook for it; a missing Makefile gets ours, which has both.
export function generatePreCommitConfig(makefile?: string): string {
  const has = (target: string): boolean => makefile === undefined || new RegExp(`^${target}:`, "m").test(makefile);
  return `repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-merge-conflict

  - repo: local
    hooks:
      - id: branch-protection
        name: spec-rails branch protection
        entry: >-
          sh -c 'branch=$(git branch --show-current 2>/dev/null || echo ""); if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then echo "ERROR: Direct commits to $branch are forbidden by Spec-Rails workflow." >&2; exit 1; fi'
        language: system
        pass_filenames: false
${has("lint") ? makeHook("lint", "linter") : ""}${has("test") ? makeHook("test", "test suite") : ""}`;
}

function setSchema(content: string): string {
  if (/^schema:[ \t]*spec-rails[ \t]*$/m.test(content)) return content;
  if (/^schema:.*$/m.test(content)) return content.replace(/^schema:.*$/m, "schema: spec-rails");
  if (content === "") return "schema: spec-rails\n";
  return `schema: spec-rails\n${content}${content.endsWith("\n") ? "" : "\n"}`;
}

function addWorktreesIgnore(content: string): string {
  if (content.includes(".worktrees/")) return content;
  if (content.trim() === "") return ".worktrees/\n";
  return `${content.trimEnd()}\n\n.worktrees/\n`;
}

// Pure: decides every write and removal from the existing snapshot and the shipped assets.
export function planInit(existing: Snapshot, assets: Assets): Plan {
  const actions: Action[] = [];
  const writes: Record<string, string> = {};
  const removals: string[] = [];
  const have = existing.files;

  const write = (p: string, content: string, onlyIfAbsent = false): void => {
    const current = have[p];
    if (current === undefined) {
      writes[p] = content;
      actions.push({ kind: "created", path: p });
    } else if (onlyIfAbsent || current === content) {
      actions.push({ kind: "skipped", path: p });
    } else {
      writes[p] = content;
      actions.push({ kind: "updated", path: p });
    }
  };

  for (const legacy of existing.legacy) {
    removals.push(legacy);
    actions.push({ kind: "removed", path: legacy });
  }
  for (const [p, content] of Object.entries(assets.managed)) write(p, content);

  write(OWNED.config, setSchema(have[OWNED.config] ?? ""));

  const preCommit = have[OWNED.preCommit];
  write(OWNED.preCommit, preCommit === undefined ? generatePreCommitConfig(have[OWNED.makefile]) : modernizePreCommitConfig(preCommit));

  const ci = have[OWNED.ci];
  if (ci === undefined || isStaleWorkflow(ci)) {
    write(OWNED.ci, assets.ci);
  } else {
    actions.push({ kind: "skipped", path: OWNED.ci });
  }

  write(OWNED.todo, assets.todo, true);
  write(OWNED.makefile, assets.makefile, true);
  write(OWNED.gitignore, addWorktreesIgnore(have[OWNED.gitignore] ?? ""));
  return { actions, writes, removals };
}

export const OVERLAY_NAMES: Record<string, string> = {
  "openspec-explore": "explore",
  "openspec-propose": "propose",
  "openspec-apply-change": "apply",
  "openspec-archive-change": "archive",
  "openspec-sync-specs": "sync",
  "openspec-update-change": "update",
};
const WORKFLOWS = new Set(Object.values(OVERLAY_NAMES));
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const DROPPED_FRONTMATTER = /^(allowed-tools:[ \t]*Bash\(openspec:\*\)|user-invocable:[ \t]*false|compatibility:[ \t]*Requires openspec CLI\.?)[ \t]*\r?\n?/gm;
const STILL_NEEDS_CLI = "still requires the openspec CLI (no port)";

function frontmatterField(text: string, key: string): string | undefined {
  const fm = FRONTMATTER.exec(text);
  return fm ? new RegExp(`^${key}:[ \\t]*(\\S+)`, "m").exec(fm[1])?.[1] : undefined;
}

function splitFrontmatter(text: string): { head: string; body: string } {
  const m = FRONTMATTER.exec(text);
  return m ? { head: m[0], body: text.slice(m[0].length) } : { head: "", body: text };
}

export function loadPorts(root: string = findAssetRoot()): Record<string, string> {
  const dir = path.join(root, "skills/ports");
  const ports: Record<string, string> = {};
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".md") || name === "EXCLUDED.md") continue;
    const text = fs.readFileSync(path.join(dir, name), "utf-8");
    const workflow = frontmatterField(text, "workflow");
    if (workflow) ports[workflow] = text;
  }
  return ports;
}

// Identifies the workflow of a generated file structurally; undefined means not an OpenSpec artifact.
function classify(rel: string, content: string): { workflow?: string } | undefined {
  const parts = rel.split("/");
  const base = parts[parts.length - 1];
  if (base === "SKILL.md") {
    const name = frontmatterField(content, "name");
    if (!name?.startsWith("openspec-")) return undefined;
    return { workflow: OVERLAY_NAMES[name] };
  }
  const stem = base.replace(/\.prompt\.md$|\.md$/, "");
  const alias = stem.replace(/^opsx-/, "");
  const opsx = stem.startsWith("opsx-") || parts[parts.length - 2] === "opsx";
  if (!opsx && !(WORKFLOWS.has(alias) && /openspec/i.test(content))) return undefined;
  return { workflow: WORKFLOWS.has(alias) ? alias : undefined };
}

export function planOverlay(files: Record<string, string>, ports: Record<string, string>): Action[] {
  const actions: Action[] = [];
  for (const rel of Object.keys(files).sort()) {
    const found = classify(rel, files[rel]);
    if (!found) continue;
    const port = found.workflow ? ports[found.workflow] : undefined;
    if (port === undefined) {
      actions.push({ kind: "skipped", path: rel, note: STILL_NEEDS_CLI });
      continue;
    }
    const { head } = splitFrontmatter(files[rel]);
    const portBody = splitFrontmatter(port).body.replace(/^\s+/, "").replace(/\s*$/, "\n");
    const cleaned = head.replace(DROPPED_FRONTMATTER, "");
    const content = cleaned === "" ? portBody : `${cleaned}\n${portBody}`;
    actions.push(content === files[rel] ? { kind: "skipped", path: rel } : { kind: "updated", path: rel, content });
  }
  return actions;
}

export function scanOverlayCandidates(cwd: string): Record<string, string> {
  const found: Record<string, string> = {};
  const add = (rel: string): void => {
    found[rel] = fs.readFileSync(path.join(cwd, rel), "utf-8");
  };
  const walk = (rel: string, accept: (name: string) => boolean, recursive: boolean): void => {
    const full = path.join(cwd, rel);
    if (!fs.existsSync(full)) return;
    for (const e of fs.readdirSync(full, { withFileTypes: true })) {
      if (e.isDirectory() && recursive) walk(`${rel}/${e.name}`, accept, recursive);
      else if (e.isFile() && accept(e.name)) add(`${rel}/${e.name}`);
    }
  };
  const SKIP = new Set([".git", ".worktrees", ".stryker-tmp"]);
  for (const top of fs.readdirSync(cwd, { withFileTypes: true })) {
    if (!top.isDirectory() || !top.name.startsWith(".") || SKIP.has(top.name)) continue;
    const base = top.name;
    walk(`${base}/commands`, () => true, true);
    walk(`${base}/prompts`, (n) => n.endsWith(".prompt.md"), false);
    const skills = path.join(cwd, base, "skills");
    if (!fs.existsSync(skills)) continue;
    for (const d of fs.readdirSync(skills, { withFileTypes: true })) {
      if (d.isDirectory() && fs.existsSync(path.join(skills, d.name, "SKILL.md"))) add(`${base}/skills/${d.name}/SKILL.md`);
    }
  }
  return found;
}

export const defaultRunner: Runner = (cmd, args, { cwd }) => {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf-8" });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", error: r.error };
};

const majorMinor = (v: string): string | undefined => /^v?(\d+)\.(\d+)/.exec(v.trim())?.slice(1, 3).join(".");

export function readPinnedVersion(root: string = findAssetRoot()): string {
  return fs.readFileSync(path.join(root, "openspec-version"), "utf-8").trim();
}

export interface BootstrapOptions {
  cwd: string;
  tools: string;
  run: Runner;
  pinned?: string;
}

export function bootstrapOpenspec(options: BootstrapOptions): Action[] {
  const { cwd, tools, run } = options;
  const target: Action = { kind: "created", path: "openspec" };
  if (fs.existsSync(path.join(cwd, "openspec"))) {
    return [{ kind: "skipped", path: target.path }];
  }
  const pinned = options.pinned ?? readPinnedVersion();
  if (!/^[A-Za-z0-9][A-Za-z0-9,-]*$/.test(tools)) {
    throw new Error(`Invalid --tools value '${tools}': expected a comma-separated list such as 'agents,claude'.`);
  }
  const probe = run("openspec", ["--version"], { cwd });
  if (probe.error || probe.status !== 0) {
    throw new Error(`The openspec CLI ${pinned} is required to create 'openspec/' but was not found on PATH.`);
  }
  const found = probe.stdout.trim();
  if (majorMinor(found) !== majorMinor(pinned)) {
    throw new Error(`openspec ${found} found on PATH but spec-rails requires ${pinned} (same major.minor).`);
  }
  const res = run("openspec", ["init", "--tools", tools, "--no-copilot-cloud", "--no-animation"], { cwd });
  if (res.error || res.status !== 0) {
    throw new Error(`'openspec init' failed${res.stderr ? `: ${res.stderr.trim()}` : "."}`);
  }
  return [target];
}

function readTree(dir: string, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(out, readTree(full, rel));
    else out[rel] = fs.readFileSync(full, "utf-8");
  }
  return out;
}

const readText = (file: string): string => fs.readFileSync(file, "utf-8");

function loadAssets(root: string): Assets {
  const managed: Record<string, string> = {};
  for (const { src, dest } of MANAGED_SOURCES) {
    const full = path.join(root, src);
    if (fs.statSync(full).isDirectory()) {
      for (const [rel, content] of Object.entries(readTree(full))) managed[`${dest}/${rel}`] = content;
    } else {
      managed[dest] = readText(full);
    }
  }
  Object.assign(managed, developerGuideDocs());
  return {
    managed,
    todo: readText(path.join(root, "templates/TODO.md")),
    ci: readText(path.join(root, "templates/spec-rails-ci.yml")),
    makefile: readText(path.join(root, "templates/Makefile")),
  };
}

function takeSnapshot(cwd: string, assets: Assets): Snapshot {
  const files: Record<string, string> = {};
  const candidates = [...Object.keys(assets.managed), ...Object.values(OWNED)];
  for (const rel of candidates) {
    const full = path.join(cwd, rel);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) files[rel] = fs.readFileSync(full, "utf-8");
  }
  const legacy = LEGACY_PATHS.filter((rel) => fs.existsSync(path.join(cwd, rel)));
  const skillDir = path.join(cwd, LEGACY_SKILL_DIR);
  if (fs.existsSync(skillDir)) {
    for (const name of fs.readdirSync(skillDir)) {
      if (name.startsWith(LEGACY_SKILL_PREFIX)) legacy.push(`${LEGACY_SKILL_DIR}/${name}`);
    }
  }
  return { files, legacy };
}

function assertNoSymlinks(cwd: string, relPaths: string[]): void {
  for (const rel of relPaths) {
    let current = cwd;
    for (const part of rel.split("/")) {
      current = path.join(current, part);
      let stat: fs.Stats;
      try {
        stat = fs.lstatSync(current);
      } catch {
        break;
      }
      if (stat.isSymbolicLink()) {
        throw new Error(`Refusing to write through symlink: ${path.relative(cwd, current)}`);
      }
    }
  }
}

function assertTarget(cwd: string): void {
  if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
    throw new Error(`Target directory does not exist: ${cwd}`);
  }
  try {
    fs.accessSync(cwd, fs.constants.W_OK);
  } catch {
    throw new Error(`Target directory is not writable: ${cwd}`);
  }
}

export function initProject(options: InitOptions = {}): InitResult {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  assertTarget(cwd);

  const root = findAssetRoot();
  const assets = loadAssets(root);
  const actions = bootstrapOpenspec({
    cwd,
    tools: options.tools ?? DEFAULT_TOOLS,
    run: options.run ?? defaultRunner,
    pinned: readPinnedVersion(root),
  });

  const plan = planInit(takeSnapshot(cwd, assets), assets);
  const removed = (rel: string): boolean => plan.removals.some((r) => rel.startsWith(`${r}/`));
  const candidates = Object.fromEntries(Object.entries(scanOverlayCandidates(cwd)).filter(([rel]) => !removed(rel)));
  const overlay = planOverlay(candidates, loadPorts(root));
  assertNoSymlinks(cwd, [...Object.keys(plan.writes), ...plan.removals, ...overlay.filter((a) => a.content !== undefined).map((a) => a.path)]);
  for (const rel of plan.removals) fs.rmSync(path.join(cwd, rel), { recursive: true });
  const writes = { ...plan.writes };
  for (const a of overlay) if (a.content !== undefined) writes[a.path] = a.content;
  for (const [rel, content] of Object.entries(writes)) {
    const full = path.join(cwd, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }

  const gitDir = path.join(cwd, ".git");
  // Stryker disable next-line ConditionalExpression: the guard only avoids a pointless hook install outside git repos
  if (fs.existsSync(gitDir) && fs.statSync(gitDir).isDirectory()) {
    fs.rmSync(path.join(gitDir, "hooks/pre-commit.legacy"), { force: true });

    // Stryker disable all: depends on the host's pre-commit CLI and would rewrite this repo's own hook
    try {
      execSync("pre-commit install", { cwd, stdio: ["ignore", "ignore", "ignore"] });
    } catch {
      // pre-commit CLI may not be on PATH in minimal or test environments
    }
    // Stryker restore all
  }

  return { actions: [...actions, ...plan.actions, ...overlay.map(({ content: _c, ...a }) => a)] };
}
