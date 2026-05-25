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
import { runPrep } from "./commands/prep.js";
import { logBus, type LogLine } from "./lib/log-bus.js";
import pc from "picocolors";

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
    .command("prep")
    .description("[BETA] Prep code for commit: auto-fix + verify (eslint --fix, prettier, tsc) in parallel, then build")
    .option("--ci", "CI mode: skip auto-fix, run checks in parallel with plain output", false)
).action((opts: SharedOpts & { ci: boolean }) => {
  guardNextProject(opts.cwd, opts.force);
  const isTTY = Boolean(process.stdin.isTTY) || Boolean(process.stdout.isTTY);
  if (opts.ci || !isTTY || opts.yes) {
    void runPrepPlain(opts, opts.ci);
  } else {
    mount("prep", opts);
  }
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

async function runPrepPlain(opts: SharedOpts, ci = false): Promise<void> {
  // In CI mode: suppress per-line subprocess output (steps give enough signal).
  // In non-TTY non-CI mode (auto-detected): stream all subprocess lines.
  const prevStatus = new Map<string, string>();
  const stepStart = new Map<string, number>();

  const onLine = (l: LogLine) => {
    if (!ci) process.stdout.write(pc.dim(`    ${l.text}\n`));
  };

  const onStep = (steps: import("./commands/cool.js").StepState[]) => {
    for (const step of steps) {
      const prev = prevStatus.get(step.id);
      if (prev === step.status) continue;
      prevStatus.set(step.id, step.status);

      if (step.status === "running") {
        stepStart.set(step.id, Date.now());
        process.stdout.write(pc.cyan(`▶ ${step.label}\n`));
      } else if (step.status === "done") {
        const ms = Date.now() - (stepStart.get(step.id) ?? Date.now());
        process.stdout.write(pc.green(`✓ ${step.label} — ${step.detail} (${(ms / 1000).toFixed(1)}s)\n`));
      } else if (step.status === "error") {
        const ms = Date.now() - (stepStart.get(step.id) ?? Date.now());
        process.stdout.write(pc.red(`✗ ${step.label} — ${step.detail} (${(ms / 1000).toFixed(1)}s)\n`));
      }
      // skipped steps not printed — no noise for phase 1 skip in CI
    }
  };

  logBus.on("line", onLine);
  try {
    const result = await runPrep({
      cwd: opts.cwd,
      dryRun: opts.dryRun,
      webpack: opts.webpack,
      memoryMb: opts.memory,
      ci,
      onStep,
    });

    if (result.failed.length > 0) {
      for (const task of result.failed) {
        process.stdout.write(pc.red(`\n✗ ${task.label} output:\n`));
        for (const line of task.lines) {
          process.stdout.write(`  ${line}\n`);
        }
      }
    }

    process.stdout.write(result.success ? pc.green(`\nprep passed\n`) : pc.red(`\nprep failed\n`));
    process.exit(result.success ? 0 : 1);
  } finally {
    logBus.off("line", onLine);
  }
}

program.parse();
