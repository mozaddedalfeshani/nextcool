import { runCmd } from "../lib/exec.js";
import { logBus } from "../lib/log-bus.js";
import { getPmInstallCommand } from "../config/targets.js";
import type { PackageManager } from "../lib/detect-pm.js";

export interface ReinstallResult {
  pm: PackageManager;
  exitCode: number;
  success: boolean;
}

export async function runReinstall(
  pm: PackageManager,
  opts: { dryRun?: boolean; cwd?: string } = {}
): Promise<ReinstallResult> {
  const { cmd, args } = getPmInstallCommand(pm);
  logBus.push("install", `Running ${cmd} ${args.join(" ")}...`);

  if (opts.dryRun) {
    logBus.push("install", `[dry-run] Would run: ${cmd} ${args.join(" ")}`);
    return { pm, exitCode: 0, success: true };
  }

  const result = await runCmd("install", cmd, args, { cwd: opts.cwd });

  if (result.exitCode !== 0) {
    logBus.push("install", `Install failed (exit ${result.exitCode})`);
  } else {
    logBus.push("install", "Install complete");
  }

  return { pm, exitCode: result.exitCode, success: result.exitCode === 0 };
}
