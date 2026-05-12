import { homedir } from "node:os";
import { join } from "node:path";
import type { PackageManager } from "../lib/detect-pm.js";
import { resolveBin } from "../lib/cmd.js";

export interface CleanTarget {
  rel: string;
  label: string;
}

export const PROJECT_TARGETS: CleanTarget[] = [
  { rel: ".next", label: ".next build cache" },
  { rel: ".turbo", label: ".turbo cache" },
  { rel: "node_modules/.cache", label: "node_modules/.cache" },
  { rel: ".swc", label: ".swc cache" },
  { rel: "tsconfig.tsbuildinfo", label: "tsconfig.tsbuildinfo" },
  { rel: ".eslintcache", label: ".eslintcache" },
];

export const FULL_TARGETS: CleanTarget[] = [
  ...PROJECT_TARGETS,
  { rel: "node_modules", label: "node_modules" },
];

export function getPmCacheCommands(
  pm: PackageManager
): { cmd: string; args: string[] }[] {
  switch (pm) {
    case "bun":
      return [{ cmd: resolveBin("bun"), args: ["pm", "cache", "rm"] }];
    case "pnpm":
      return [{ cmd: resolveBin("pnpm"), args: ["store", "prune"] }];
    case "yarn":
      return [
        { cmd: resolveBin("yarn"), args: ["cache", "clean"] },
        { cmd: resolveBin("yarn"), args: ["cache", "clean", "--all"] },
      ];
    case "npm":
    default:
      return [{ cmd: resolveBin("npm"), args: ["cache", "clean", "--force"] }];
  }
}

export function getPmInstallCommand(
  pm: PackageManager
): { cmd: string; args: string[] } {
  switch (pm) {
    case "bun":
      return { cmd: "bun", args: ["install"] };
    case "pnpm":
      return { cmd: resolveBin("pnpm"), args: ["install"] };
    case "yarn":
      return { cmd: resolveBin("yarn"), args: ["install"] };
    case "npm":
    default:
      return { cmd: resolveBin("npm"), args: ["install"] };
  }
}

export function getBunCacheDir(): string {
  return join(homedir(), ".bun", "install", "cache");
}

export function getXdgCacheHome(): string {
  return process.env["XDG_CACHE_HOME"] ?? join(homedir(), ".cache");
}
