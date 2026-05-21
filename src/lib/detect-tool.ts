import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Detect whether a dev tool (eslint, prettier, …) is available for a project.
 * True if the tool is a dependency in package.json OR a known config file exists.
 */
export function hasTool(
  cwd: string,
  depName: string,
  configFiles: string[]
): boolean {
  try {
    const raw = readFileSync(join(cwd, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    if (pkg.dependencies?.[depName] || pkg.devDependencies?.[depName]) {
      return true;
    }
  } catch {
    // no/invalid package.json — fall through to config-file check
  }
  return configFiles.some((f) => existsSync(join(cwd, f)));
}

const ESLINT_CONFIGS = [
  ".eslintrc",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.json",
  ".eslintrc.yml",
  ".eslintrc.yaml",
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  "eslint.config.ts",
];

const PRETTIER_CONFIGS = [
  ".prettierrc",
  ".prettierrc.js",
  ".prettierrc.cjs",
  ".prettierrc.json",
  ".prettierrc.yml",
  ".prettierrc.yaml",
  ".prettierrc.toml",
  "prettier.config.js",
  "prettier.config.cjs",
  "prettier.config.mjs",
];

export function hasEslint(cwd: string): boolean {
  return hasTool(cwd, "eslint", ESLINT_CONFIGS);
}

export function hasPrettier(cwd: string): boolean {
  return hasTool(cwd, "prettier", PRETTIER_CONFIGS);
}
