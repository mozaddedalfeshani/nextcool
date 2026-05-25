import { existsSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { runCmd } from "../lib/exec.js";
import { resolveBin } from "../lib/cmd.js";
import { logBus } from "../lib/log-bus.js";
import { hasEslint, hasPrettier } from "../lib/detect-tool.js";
import { runRebuild } from "./rebuild.js";
import type { StepState, StepStatus } from "./cool.js";

/**
 * `nextcool prep` — one-shot code-quality pass to prepare code for commit.
 *
 * Phase 1 (writers, sequential — they mutate files):
 *   eslint . --fix  →  prettier --write .
 * Phase 2 (checks, parallel — read-only, safe together):
 *   eslint . --max-warnings=0  +  prettier --check .  +  tsc --noEmit --incremental false
 * Phase 3 (build): next build, only if every check passed.
 *
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

  const steps: StepState[] = [
    { id: "lint-fix", label: "Lint --fix (eslint)", status: "pending", detail: "" },
    { id: "prettier-write", label: "Format --write (prettier)", status: "pending", detail: "" },
    { id: "lint-strict", label: "Lint strict (max-warnings 0)", status: "pending", detail: "" },
    { id: "prettier-check", label: "Format --check (prettier)", status: "pending", detail: "" },
    { id: "typecheck", label: "Typecheck (tsc)", status: "pending", detail: "" },
    { id: "build", label: "Build (next build)", status: "pending", detail: "" },
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
  await runStep("lint-fix", eslint, ["eslint", ".", "--fix"], "eslint not found");
  await runStep("prettier-write", prettier, ["prettier", "--write", "."], "prettier not found");

  // Phase 2 — read-only checks, parallel.
  await Promise.all([
    runStep("lint-strict", eslint, ["eslint", ".", "--max-warnings=0"], "eslint not found"),
    runStep("prettier-check", prettier, ["prettier", "--check", "."], "prettier not found"),
    runStep("typecheck", tsconfig, ["tsc", "--noEmit", "--incremental", "false"], "no tsconfig.json"),
  ]);

  // Phase 3 — build only if nothing failed.
  const checksFailed = steps.some((s) => s.status === "error");
  if (checksFailed) {
    setStep("build", "skipped", "checks failed");
  } else {
    setStep("build", "running", "next build");
    if (dryRun) {
      logBus.push("build", "[dry-run] Would run: next build");
      setStep("build", "skipped", "dry-run");
    } else {
      const r = await runRebuild({ cwd, webpack: opts.webpack, memoryMb: opts.memoryMb });
      // runRebuild logs under "rebuild"; mirror those lines into "build" so the
      // deferred error dump finds them under this step's id.
      if (!r.success) {
        for (const l of logBus.getLines("rebuild")) logBus.push("build", l.text);
      }
      setStep("build", r.success ? "done" : "error", r.success ? "complete" : `exit ${r.exitCode}`);
    }
  }

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
