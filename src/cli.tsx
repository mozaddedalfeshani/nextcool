import React from "react";
import { render } from "ink";
import { Command } from "commander";
import { App, type AppMode } from "./app.js";
import { isNextProject } from "./lib/detect-pm.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CoolOptions } from "./commands/cool.js";
import type { ServerMode } from "./commands/run-server.js";
import { runActionRunner, type RunnerOs } from "./commands/action-runner.js";
import { runCi } from "./commands/ci.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface SharedOpts {
  dryRun: boolean;
  yes: boolean;
  full: boolean;
  webpack: boolean;
  memory?: number;
  cwd: string;
  force: boolean;
  dev: boolean;
  prod: boolean;
}

function resolveServerAfter(opts: SharedOpts): ServerMode | undefined {
  if (opts.dev && opts.prod) {
    console.error("\nError: --dev and --prod are mutually exclusive.\n");
    process.exit(1);
  }
  if (opts.dev) return "dev";
  if (opts.prod) return "start";
  return undefined;
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
    .option("--full", "also delete node_modules", false)
    .option("--webpack", "rebuild with --no-turbo (Turbopack workaround)", false)
    .option("--memory <mb>", "set NODE_OPTIONS --max-old-space-size", (v) => parseInt(v, 10))
    .option("--cwd <path>", "target project directory", process.cwd())
    .option("--force", "run even outside a Next.js project", false)
    .option("--dev", "boot `next dev` after the pipeline completes", false)
    .option("--prod", "boot `next start` after the pipeline completes", false);
}

function mount(mode: AppMode, opts: SharedOpts, extraCoolOpts: Partial<CoolOptions> = {}): void {
  const serverAfter = resolveServerAfter(opts);
  const { waitUntilExit } = render(
    <App
      mode={mode}
      cwd={opts.cwd}
      dryRun={opts.dryRun}
      full={opts.full}
      webpack={opts.webpack}
      memoryMb={opts.memory}
      serverAfter={serverAfter}
      {...extraCoolOpts}
    />,
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

// Default: no subcommand → interactive TUI menu (or auto-cool in non-TTY/CI)
addSharedOpts(program).action((opts: SharedOpts) => {
  const isTTY = Boolean(process.stdin.isTTY) || Boolean(process.stdout.isTTY);
  const mode: AppMode = isTTY && !opts.yes ? "interactive" : "cool";
  if (!isTTY || opts.yes) {
    guardNextProject(opts.cwd, opts.force);
  }
  mount(mode, opts);
});

addSharedOpts(
  program
    .command("cool")
    .description("Full pipeline: kill → clean → purge PM cache → reinstall → rebuild (non-interactive)")
).action((opts: SharedOpts) => {
  guardNextProject(opts.cwd, opts.force);
  mount("cool", opts);
});

addSharedOpts(
  program
    .command("fullclean")
    .description("Deep reset: kill → wipe node_modules → reinstall → lint → prettier → rebuild")
).action((opts: SharedOpts) => {
  guardNextProject(opts.cwd, opts.force);
  mount("fullclean", opts);
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
  .command("action-runner")
  .description("Generate a GitHub Actions workflow that runs the nextcool ci quality gate")
  .option("--yes", "skip confirmations (CI mode)", false)
  .option("--cwd <path>", "target project directory", process.cwd())
  .option("--linux", "target ubuntu-latest runner", false)
  .option("--windows", "target windows-latest runner", false)
  .option("--mac", "target macos-latest runner", false)
  .option("--install", "write the workflow file (default)", false)
  .option("--uninstall", "remove the workflow file", false)
  .action(
    (opts: {
      cwd: string;
      linux: boolean;
      windows: boolean;
      mac: boolean;
      install: boolean;
      uninstall: boolean;
    }) => {
      const picked = [opts.linux, opts.windows, opts.mac].filter(Boolean).length;
      if (picked > 1) {
        console.error("\nError: pick at most one of --linux / --windows / --mac.\n");
        process.exit(1);
      }
      const os: RunnerOs | undefined = opts.linux
        ? "linux"
        : opts.windows
          ? "windows"
          : opts.mac
            ? "mac"
            : undefined;

      const result = runActionRunner({
        cwd: opts.cwd,
        os,
        uninstall: opts.uninstall,
      });

      switch (result.action) {
        case "installed":
          console.log(`✓ Wrote workflow for ${result.os} → ${result.path}`);
          break;
        case "uninstalled":
          console.log(`✓ Removed workflow → ${result.path}`);
          break;
        case "missing":
          console.log(`No workflow to remove at ${result.path}`);
          break;
      }
      process.exit(0);
    }
  );

program
  .command("ci")
  .description("CI quality gate: install → typecheck → lint → format:check → build (plain output, real exit codes)")
  .option("--cwd <path>", "target project directory", process.cwd())
  .option("--skip-install", "skip dependency install (CI already installed)", false)
  .option("--webpack", "build with --no-turbo (Turbopack workaround)", false)
  .option("--memory <mb>", "set NODE_OPTIONS --max-old-space-size", (v) => parseInt(v, 10))
  .option("--report", "measure build time + bundle size, emit a build report", false)
  .option("--baseline <file>", "previous report JSON to diff against (base branch)")
  .option("--report-out <file>", "where to write this run's report JSON", "nextcool-report.json")
  .option("--fail-on-growth <pct>", "fail if client bundle grows by ≥ pct (needs --baseline)", (v) => parseFloat(v))
  .option("--force", "run even outside a Next.js project", false)
  .action(
    async (_opts, cmd: Command) => {
      // Read merged opts: the root program also declares --cwd/--force, which
      // shadows the subcommand's local copies; optsWithGlobals resolves the
      // value the user actually passed. (See README note on this Commander quirk.)
      const opts = cmd.optsWithGlobals() as {
        cwd: string;
        skipInstall: boolean;
        webpack: boolean;
        memory?: number;
        report: boolean;
        baseline?: string;
        reportOut: string;
        failOnGrowth?: number;
        force: boolean;
      };
      guardNextProject(opts.cwd, opts.force);
      const result = await runCi({
        cwd: opts.cwd,
        skipInstall: opts.skipInstall,
        webpack: opts.webpack,
        memoryMb: opts.memory,
        report: opts.report,
        baseline: opts.baseline,
        reportOut: opts.reportOut,
        failOnGrowth: opts.failOnGrowth,
      });
      process.exit(result.exitCode);
    }
  );

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
      dev: false,
      prod: false,
    });
  });

program.parse();
