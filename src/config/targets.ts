import { homedir } from "node:os";
import { join } from "node:path";
import type { PackageManager } from "../lib/detect-pm.js";

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
      return [{ cmd: "bun", args: ["pm", "cache", "rm"] }];
    case "pnpm":
      return [{ cmd: "pnpm", args: ["store", "prune"] }];
    case "yarn":
      return [
        { cmd: "yarn", args: ["cache", "clean"] },
        { cmd: "yarn", args: ["cache", "clean", "--all"] },
      ];
    case "npm":
    default:
      return [{ cmd: "npm", args: ["cache", "clean", "--force"] }];
  }
}

export function getPmInstallCommand(
  pm: PackageManager
): { cmd: string; args: string[] } {
  switch (pm) {
    case "bun":
      return { cmd: "bun", args: ["install"] };
    case "pnpm":
      return { cmd: "pnpm", args: ["install"] };
    case "yarn":
      return { cmd: "yarn", args: ["install"] };
    case "npm":
    default:
      return { cmd: "npm", args: ["install"] };
  }
}

export function getBunCacheDir(): string {
  return join(homedir(), ".bun", "install", "cache");
}

export function getXdgCacheHome(): string {
  return process.env["XDG_CACHE_HOME"] ?? join(homedir(), ".cache");
}
