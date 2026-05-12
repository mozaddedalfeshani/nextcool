import React from "react";
import { render } from "ink";
import { Command } from "commander";
import { App } from "./app.js";
import { isNextProject } from "./lib/detect-pm.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CoolOptions } from "./commands/cool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

type AppMode = "cool" | "clean" | "purge" | "kill" | "doctor";

interface SharedOpts {
  dryRun: boolean;
  yes: boolean;
  full: boolean;
  webpack: boolean;
  memory?: number;
  cwd: string;
  force: boolean;
}

function getVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf8")
    ) as { version: string };
    return pkg.version;
  } catch {
    return "0.1.0";
  }
}

function guardNextProject(cwd: string, force: boolean): void {
  if (!isNextProject(cwd) && !force) {
    console.error(
      "\nError: Not a Next.js project (no `next` dep in package.json).\n" +
        "Run with --force to override, or cd into your Next.js project first.\n"
    );
    process.exit(1);
  }
}

function addSharedOpts(cmd: Command): Command {
  return cmd
    .option("--dry-run", "show changes without applying them", false)
    .option("--yes", "skip confirmations (CI mode)", false)
    .option("--full", "also delete node_modules (use with clean/cool)", false)
    .option("--webpack", "rebuild with --no-turbo (Turbopack workaround)", false)
    .option("--memory <mb>", "set NODE_OPTIONS --max-old-space-size", (v) => parseInt(v, 10))
    .option("--cwd <path>", "target project directory", process.cwd())
    .option("--force", "run even outside a Next.js project", false);
}

function mount(mode: AppMode, opts: SharedOpts): void {
  const coolOpts: CoolOptions = {
    dryRun: opts.dryRun,
    full: opts.full,
    webpack: opts.webpack,
    memoryMb: opts.memory,
    cwd: opts.cwd,
    skipKill: mode !== "kill" && mode !== "cool",
    skipInstall: mode !== "cool",
    skipBuild: mode !== "cool",
  };

  const { waitUntilExit } = render(
    <App mode={mode} cwd={opts.cwd} {...coolOpts} />,
    { exitOnCtrlC: true }
  );

  waitUntilExit()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

const program = new Command()
  .name("nextcool")
  .description("Kill zombie node processes, purge caches, rebuild Next.js. Beat the heat.")
  .version(getVersion(), "-v, --version");

addSharedOpts(
  program
    .command("cool", { isDefault: true })
    .description("Full pipeline: kill → clean artifacts → purge PM cache → reinstall → rebuild")
).action((opts: SharedOpts) => {
  guardNextProject(opts.cwd, opts.force);
  mount("cool", opts);
});

addSharedOpts(
  program
    .command("clean")
    .description("Delete .next, .turbo, node_modules/.cache and other build artifacts")
).action((opts: SharedOpts) => {
  guardNextProject(opts.cwd, opts.force);
  mount("clean", opts);
});

addSharedOpts(
  program
    .command("purge")
    .description("Wipe package manager cache (bun / pnpm / npm / yarn)")
).action((opts: SharedOpts) => {
  mount("purge", opts);
});

addSharedOpts(
  program
    .command("kill")
    .description("Kill all node/next processes owned by current user")
).action((opts: SharedOpts) => {
  mount("kill", opts);
});

program
  .command("doctor")
  .description("Diagnose environment: RAM, disk, zombies, Turbopack issues")
  .option("--cwd <path>", "target project directory", process.cwd())
  .option("--force", "skip Next.js project check", false)
  .action((opts: { cwd: string; force: boolean }) => {
    mount("doctor", {
      dryRun: false,
      yes: false,
      full: false,
      webpack: false,
      cwd: opts.cwd,
      force: opts.force,
    });
  });

program.parse();
