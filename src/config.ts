import { z } from "zod";
import * as fs from "node:fs";

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
  const content = fs.readFileSync(configPath, "utf-8");
  const raw = JSON.parse(content);
  return parseConfig(raw);
}
