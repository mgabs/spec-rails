import * as fs from "node:fs";
import * as path from "node:path";

export function resolveCanonicalPath(targetPath: string): string {
  if (!fs.existsSync(targetPath)) {
    const parent = path.dirname(targetPath);
    const canonicalParent = fs.realpathSync(parent);
    return path.join(canonicalParent, path.basename(targetPath));
  }
  return fs.realpathSync(targetPath);
}

export function isPathInside(childPath: string, parentPath: string): boolean {
  const relative = path.relative(parentPath, childPath);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function validatePathSandbox(
  targetPath: string,
  repoRoot: string,
  allowlistPrefixes?: string[]
): string {
  const canonicalTarget = resolveCanonicalPath(targetPath);
  const canonicalRoot = resolveCanonicalPath(repoRoot);

  if (isPathInside(canonicalTarget, canonicalRoot)) {
    return canonicalTarget;
  }

  if (allowlistPrefixes) {
    for (const prefix of allowlistPrefixes) {
      const canonicalPrefix = resolveCanonicalPath(prefix);
      if (isPathInside(canonicalTarget, canonicalPrefix)) {
        return canonicalTarget;
      }
    }
  }

  throw new Error(
    `Path traversal escape detected: '${targetPath}' (resolved as '${canonicalTarget}') resolves outside repository root '${canonicalRoot}'`
  );
}
