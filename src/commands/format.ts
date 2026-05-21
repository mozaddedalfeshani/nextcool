import { runCmd } from "../lib/exec.js";
import { logBus } from "../lib/log-bus.js";
import { resolveBin } from "../lib/cmd.js";
import { hasPrettier } from "../lib/detect-tool.js";

export interface FormatResult {
  exitCode: number;
  success: boolean;
  skipped: boolean;
}

/**
 * Run prettier --write (format in place), then prettier --check (verify).
 * With checkOnly, skip --write and only verify — used in CI where the tree
 * must not be mutated; a formatting drift then fails the run.
 * Skipped when prettier is not a dep and no config file exists.
 */
export async function runFormat(
  opts: { dryRun?: boolean; cwd?: string; checkOnly?: boolean } = {}
): Promise<FormatResult> {
  const cwd = opts.cwd ?? process.cwd();

  if (!hasPrettier(cwd)) {
    logBus.push("format", "prettier not found (no dep, no config) — skipping");
    return { exitCode: 0, success: true, skipped: true };
  }

  const npx = resolveBin("npx");

  if (opts.checkOnly) {
    if (opts.dryRun) {
      logBus.push("format", "[dry-run] Would run: npx prettier --check .");
      return { exitCode: 0, success: true, skipped: false };
    }
    logBus.push("format", "Running prettier --check ...");
    const check = await runCmd("format", npx, ["prettier", "--check", "."], { cwd });
    if (check.exitCode !== 0) {
      logBus.push("format", `prettier --check failed (exit ${check.exitCode})`);
    } else {
      logBus.push("format", "Formatting verified");
    }
    return { exitCode: check.exitCode, success: check.exitCode === 0, skipped: false };
  }

  if (opts.dryRun) {
    logBus.push("format", "[dry-run] Would run: npx prettier --write . && npx prettier --check .");
    return { exitCode: 0, success: true, skipped: false };
  }

  logBus.push("format", "Running prettier --write ...");
  const write = await runCmd("format", npx, ["prettier", "--write", "."], { cwd });
  if (write.exitCode !== 0) {
    logBus.push("format", `prettier --write failed (exit ${write.exitCode})`);
    return { exitCode: write.exitCode, success: false, skipped: false };
  }

  logBus.push("format", "Running prettier --check ...");
  const check = await runCmd("format", npx, ["prettier", "--check", "."], { cwd });
  if (check.exitCode !== 0) {
    logBus.push("format", `prettier --check failed (exit ${check.exitCode})`);
  } else {
    logBus.push("format", "Formatting verified");
  }

  return {
    exitCode: check.exitCode,
    success: check.exitCode === 0,
    skipped: false,
  };
}
