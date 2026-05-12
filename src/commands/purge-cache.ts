import { runCmd } from "../lib/exec.js";
import { logBus } from "../lib/log-bus.js";
import { getPmCacheCommands } from "../config/targets.js";
import type { PackageManager } from "../lib/detect-pm.js";

export interface PurgeResult {
  pm: PackageManager;
  success: boolean;
  exitCode: number;
}

export async function runPurgeCache(
  pm: PackageManager,
  opts: { dryRun?: boolean } = {}
): Promise<PurgeResult> {
  const cmds = getPmCacheCommands(pm);
  logBus.push("purge", `Purging ${pm} cache...`);

  if (opts.dryRun) {
    logBus.push("purge", `[dry-run] Would run: ${cmds.map((c) => `${c.cmd} ${c.args.join(" ")}`).join(" && ")}`);
    return { pm, success: true, exitCode: 0 };
  }

  let lastCode = 0;
  for (const { cmd, args } of cmds) {
    try {
      const result = await runCmd("purge", cmd, args);
      lastCode = result.exitCode;
      if (result.exitCode !== 0) {
        // yarn berry "clean --all" may fail on classic; not fatal
        logBus.push("purge", `Warning: ${cmd} exited ${result.exitCode}`);
      }
    } catch (e) {
      logBus.push("purge", `Warning: ${cmd} failed — ${String(e)}`);
    }
  }

  return { pm, success: lastCode === 0, exitCode: lastCode };
}
