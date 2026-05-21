import { runCmd } from "../lib/exec.js";
import { logBus } from "../lib/log-bus.js";
import { resolveBin } from "../lib/cmd.js";
import { hasEslint } from "../lib/detect-tool.js";

export interface LintResult {
  exitCode: number;
  success: boolean;
  skipped: boolean;
}

export async function runLint(
  opts: { dryRun?: boolean; cwd?: string } = {}
): Promise<LintResult> {
  const cwd = opts.cwd ?? process.cwd();

  if (!hasEslint(cwd)) {
    logBus.push("lint", "eslint not found (no dep, no config) — skipping");
    return { exitCode: 0, success: true, skipped: true };
  }

  const args = ["eslint", "."];
  logBus.push("lint", `Running eslint .${opts.dryRun ? " [dry-run]" : ""}...`);

  if (opts.dryRun) {
    logBus.push("lint", `[dry-run] Would run: npx eslint .`);
    return { exitCode: 0, success: true, skipped: false };
  }

  const result = await runCmd("lint", resolveBin("npx"), args, { cwd });

  if (result.exitCode !== 0) {
    logBus.push("lint", `Lint failed (exit ${result.exitCode})`);
  } else {
    logBus.push("lint", "Lint clean");
  }

  return {
    exitCode: result.exitCode,
    success: result.exitCode === 0,
    skipped: false,
  };
}
