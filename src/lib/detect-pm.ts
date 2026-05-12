import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type PackageManager = "bun" | "pnpm" | "yarn" | "npm";

export function detectPm(cwd = process.cwd()): PackageManager {
  if (existsSync(join(cwd, "bun.lockb")) || existsSync(join(cwd, "bun.lock")))
    return "bun";
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
  return "npm";
}

export function detectNextVersion(cwd = process.cwd()): string | null {
  try {
    const raw = readFileSync(join(cwd, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return (
      pkg.dependencies?.["next"] ??
      pkg.devDependencies?.["next"] ??
      null
    );
  } catch {
    return null;
  }
}

export function isNextProject(cwd = process.cwd()): boolean {
  return detectNextVersion(cwd) !== null;
}
