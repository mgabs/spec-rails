import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";

export const StackSchema = z.enum(["auto", "ts", "python", "go", "rust"]);
export type Stack = z.infer<typeof StackSchema>;

export function getDefaultTestGlobs(stack: Stack): string[] {
  switch (stack) {
    case "ts":
      return ["src/**/*.test.ts", "tests/**/*.spec.ts"];
    case "python":
      return ["tests/**/test_*.py", "**/test_*.py"];
    case "go":
      return ["**/*_test.go"];
    case "rust":
      return ["tests/**/*.rs", "src/**/*.rs"];
    default:
      return ["tests/**", "src/**/*.test.*", "**/*_test.*"];
  }
}

export const ConfigSchema = z.object({
  $schema: z.string().optional(),
  stack: StackSchema.default("auto"),
  strict: z.boolean().default(true),
  testGlobs: z.array(z.string()).optional(),
  testCommand: z.string().min(1, "testCommand cannot be empty"),
  coverageCommand: z.string().optional(),
  coverageMinScore: z.number().min(0).max(100).default(95),
  mutationCommand: z.string().optional(),
  mutationMinScore: z.number().min(0).max(100).default(95),
}).transform((cfg) => {
  if (!cfg.testGlobs || cfg.testGlobs.length === 0) {
    return {
      ...cfg,
      testGlobs: getDefaultTestGlobs(cfg.stack),
    };
  }
  return cfg;
});

export type Config = z.infer<typeof ConfigSchema>;

export function parseConfig(raw: unknown): Config {
  return ConfigSchema.parse(raw);
}

export function loadConfigFile(configPath: string): Config {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  const content = fs.readFileSync(configPath).toString("utf-8");
  const raw = JSON.parse(content);
  return parseConfig(raw);
}

export function loadLegacyRailsConf(filePath: string): Partial<Config> | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);
  const result: any = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(.*))$/);
    if (!match) continue;

    const key = match[1];
    const val = (match[2] ?? match[3] ?? match[4] ?? "").trim();

    switch (key) {
      case "RAILS_TEST":
        if (val) result.testCommand = val;
        break;
      case "RAILS_COVERAGE":
        if (val) result.coverageCommand = val;
        break;
      case "RAILS_MUTATION":
        if (val) result.mutationCommand = val;
        break;
      case "RAILS_TEST_DIRS":
        if (val) {
          const dirs = val.split(/\s+/).filter(Boolean);
          result.testGlobs = dirs.map((d) => (d.endsWith("/**") ? d : `${d}/**`));
        }
        break;
    }
  }

  return result;
}

export function loadConfig(cwd: string = process.cwd()): Config {
  const jsonPath = path.join(cwd, "spec-rails.config.json");
  if (fs.existsSync(jsonPath)) {
    return loadConfigFile(jsonPath);
  }

  const legacyPath = path.join(cwd, "openspec/spec-rails/rails.conf");
  if (fs.existsSync(legacyPath)) {
    console.warn(
      "[spec-rails] Warning: openspec/spec-rails/rails.conf is deprecated. Please migrate to spec-rails.config.json."
    );
    const legacy = loadLegacyRailsConf(legacyPath) || {};
    return parseConfig({
      testCommand: legacy.testCommand || "npm test",
      ...legacy,
    });
  }

  return parseConfig({
    stack: "auto",
    testCommand: "npm test",
  });
}
