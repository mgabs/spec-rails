import { cac, type CAC } from "cac";
import { initProject } from "./commands/init.js";
import pkg from "../package.json" with { type: "json" };

export function createCli(): CAC {
  const cli = cac("spec-rails");

  cli
    .command("init [dir]", "Initialize Spec-Rails in the target repository")
    .option("--tools <list>", "Comma-separated tools forwarded to `openspec init --tools`", { default: "agents" })
    .action((dir, options) => {
      const res = initProject({ cwd: dir || process.cwd(), tools: options.tools });
      const shown = res.actions.filter((a) => a.kind !== "skipped" || a.note);
      for (const action of shown) {
        console.log(`[spec-rails] ${action.kind} ${action.path}${action.note ? ` (${action.note})` : ""}`);
      }
      if (res.actions.some((a) => a.kind === "created" && a.path === "openspec/spec-rails/TODO.md")) {
        console.log("[spec-rails] next: complete openspec/spec-rails/TODO.md to set up your quality gates");
      }
      if (!res.actions.some((a) => a.kind !== "skipped")) console.log("[spec-rails] already up to date");
    });

  cli.on("command:*", () => {
    throw new Error(`Unknown command: ${cli.args.join(" ")}. Only 'init' is available.`);
  });

  cli.help();
  cli.version(pkg.version);

  return cli;
}

export function runCli(argv: string[] = process.argv): void {
  const cli = createCli();
  try {
    cli.parse(argv);
  } catch (err: any) {
    console.error(`[spec-rails error] ${err.message}`);
    process.exit(1);
  }
}

// Only auto-run if directly executed
// Stryker disable all: entry-point detection cannot be exercised in-process
/* v8 ignore next 3 */
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("cli.js") || process.argv[1]?.endsWith("cli.ts")) {
  runCli();
}
// Stryker restore all
