import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { runCmd } from "../lib/exec.js";
import { resolveBin } from "../lib/cmd.js";
import { logBus } from "../lib/log-bus.js";
import { hasEslint, hasPrettier } from "../lib/detect-tool.js";
import type { StepState, StepStatus } from "./cool.js";

/**
 * `nextcool prep` — one-shot code-quality pass to prepare code for commit.
 *
 * Phase 1 (writers, sequential — they mutate files):
 *   eslint . --fix  →  prettier --write .
 * Phase 2 (checks, parallel — read-only, safe together):
 *   eslint . --max-warnings=0  +  prettier --check .  +  tsc --noEmit --incremental false
 * Failures never abort early and are not highlighted mid-run: every task runs
 * to completion, and each failed task's console output is collected (via
 * logBus.getLines) so the UI can dump it all at the very end.
 */

export interface PrepOptions {
  cwd?: string;
  dryRun?: boolean;
  webpack?: boolean;
  memoryMb?: number;
  onStep?: (steps: StepState[]) => void;
}

export interface FailedTask {
  id: string;
  label: string;
  lines: string[];
}

export interface PrepResult {
  steps: StepState[];
  success: boolean;
  failed: FailedTask[];
  elapsedMs: number;
}

const MAX_ERROR_LINES = 30;

/**
 * ESLint added `--concurrency` (multi-threaded linting across all cores) in
 * v9.30. Older versions error on the unknown flag, so we only add it when the
 * installed eslint is new enough — reading the real version from node_modules.
 */
function eslintSupportsConcurrency(cwd: string): boolean {
  try {
    const pkg = JSON.parse(
      readFileSync(join(cwd, "node_modules", "eslint", "package.json"), "utf8")
    ) as { version?: string };
    const v = pkg.version ?? "";
    const m = /^(\d+)\.(\d+)/.exec(v);
    if (!m) return false;
    const major = Number(m[1]);
    const minor = Number(m[2]);
    return major > 9 || (major === 9 && minor >= 30);
  } catch {
    return false;
  }
}

export async function runPrep(opts: PrepOptions = {}): Promise<PrepResult> {
  const cwd = opts.cwd ?? process.cwd();
  const dryRun = opts.dryRun ?? false;
  const start = Date.now();
  const npx = resolveBin("npx");

  // Let every check use all cores. Each tool is a separate process, so the
  // parallel phase already spreads across cores; bumping UV_THREADPOOL_SIZE to
  // the core count lets each tool's file I/O (eslint/prettier glob + read) use
  // every core too instead of libuv's default 4 threads.
  const cores = os.cpus().length;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    UV_THREADPOOL_SIZE: String(cores),
  };

  const eslint = hasEslint(cwd);
  const prettier = hasPrettier(cwd);
  const tsconfig = existsSync(join(cwd, "tsconfig.json"));

  // Lint `src` when it exists, else `.`. Many flat ESLint configs only scope
  // src/ and don't ignore root files (tailwind.config.ts, scripts/, etc), so
  // `eslint .` floods false errors. prettier still runs on `.` (configs cover it).
  const lintTarget = existsSync(join(cwd, "src")) ? "src" : ".";

  // Use all cores for eslint when the installed version supports it.
  const eslintConcurrency = eslintSupportsConcurrency(cwd) ? ["--concurrency=auto"] : [];

  const steps: StepState[] = [
    { id: "lint-fix", label: "Lint --fix (eslint)", status: "pending", detail: "" },
    { id: "prettier-write", label: "Format --write (prettier)", status: "pending", detail: "" },
    { id: "lint-strict", label: "Lint strict (max-warnings 0)", status: "pending", detail: "" },
    { id: "prettier-check", label: "Format --check (prettier)", status: "pending", detail: "" },
    { id: "typecheck", label: "Typecheck (tsc)", status: "pending", detail: "" },
  ];

  function setStep(id: string, status: StepStatus, detail: string) {
    const step = steps.find((s) => s.id === id);
    if (step) {
      step.status = status;
      step.detail = detail;
    }
    opts.onStep?.([...steps]);
  }

  // Run one npx command for a step; returns true on success. Skipped tools are
  // marked "skipped" and count as success (don't block the build).
  async function runStep(
    id: string,
    available: boolean,
    args: string[],
    skipDetail: string
  ): Promise<boolean> {
    if (!available) {
      setStep(id, "skipped", skipDetail);
      return true;
    }
    setStep(id, "running", `npx ${args.join(" ")}`);
    if (dryRun) {
      logBus.push(id, `[dry-run] Would run: npx ${args.join(" ")}`);
      setStep(id, "skipped", "dry-run");
      return true;
    }
    const r = await runCmd(id, npx, args, { cwd, env });
    const ok = r.exitCode === 0;
    setStep(id, ok ? "done" : "error", ok ? "passed" : `exit ${r.exitCode}`);
    return ok;
  }

  // Phase 1 — writers, sequential. prettier --write runs after eslint --fix so
  // it formats the fixed output.
  await runStep("lint-fix", eslint, ["eslint", lintTarget, "--fix", ...eslintConcurrency], "eslint not found");
  await runStep("prettier-write", prettier, ["prettier", "--write", "."], "prettier not found");

  // Phase 2 — read-only checks, parallel.
  await Promise.all([
    runStep("lint-strict", eslint, ["eslint", lintTarget, "--max-warnings=0", ...eslintConcurrency], "eslint not found"),
    runStep("prettier-check", prettier, ["prettier", "--check", "."], "prettier not found"),
    runStep("typecheck", tsconfig, ["tsc", "--noEmit", "--incremental", "false"], "no tsconfig.json"),
  ]);

  // Collect console output for every failed step (deferred end-of-run dump).
  const failed: FailedTask[] = steps
    .filter((s) => s.status === "error")
    .map((s) => ({
      id: s.id,
      label: s.label,
      lines: logBus.getLines(s.id).map((l) => l.text).slice(-MAX_ERROR_LINES),
    }));

  return {
    steps,
    success: failed.length === 0,
    failed,
    elapsedMs: Date.now() - start,
  };
}
