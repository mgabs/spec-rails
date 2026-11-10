export const TOOLS: string;
export function upgrade(opts: {
  version: string;
  root: string;
  npx?: string;
  out?: (m: string) => void;
  err?: (m: string) => void;
}): number | void;
export function main(argv: string[], env: Record<string, string | undefined>, root: string): number | void;
