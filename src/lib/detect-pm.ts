import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type PackageManager = "bun" | "pnpm" | "yarn" | "npm";

export interface DetectedPm {
  pm: PackageManager;
  lockfile: string;
}

const LOCKFILE_MAP: { file: string; pm: PackageManager }[] = [
  { file: "bun.lockb", pm: "bun" },
  { file: "bun.lock", pm: "bun" },
  { file: "pnpm-lock.yaml", pm: "pnpm" },
  { file: "yarn.lock", pm: "yarn" },
  { file: "package-lock.json", pm: "npm" },
];

export function detectAllPms(cwd = process.cwd()): DetectedPm[] {
  const seen = new Set<PackageManager>();
  const found: DetectedPm[] = [];
  for (const { file, pm } of LOCKFILE_MAP) {
    if (!seen.has(pm) && existsSync(join(cwd, file))) {
      seen.add(pm);
      found.push({ pm, lockfile: file });
    }
  }
  return found;
}

export function detectPm(cwd = process.cwd()): PackageManager {
  const all = detectAllPms(cwd);
  return all[0]?.pm ?? "npm";
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
