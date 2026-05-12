import { safeRm } from "../lib/safe-rm.js";
import { logBus } from "../lib/log-bus.js";
import { PROJECT_TARGETS, FULL_TARGETS } from "../config/targets.js";
import { formatBytes } from "../lib/system.js";

export interface CleanOptions {
  dryRun?: boolean;
  full?: boolean;
  cwd?: string;
  onProgress?: (label: string, done: number, total: number) => void;
}

export interface CleanResult {
  removed: string[];
  totalBytes: number;
}

export async function runClean(opts: CleanOptions = {}): Promise<CleanResult> {
  const cwd = opts.cwd ?? process.cwd();
  const targets = opts.full ? FULL_TARGETS : PROJECT_TARGETS;
  const removed: string[] = [];
  let totalBytes = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]!;
    opts.onProgress?.(t.label, i, targets.length);
    const result = await safeRm(t.rel, { dryRun: opts.dryRun, cwd });

    if (result.existed) {
      logBus.push(
        "clean",
        `${opts.dryRun ? "[dry-run] " : ""}Removed ${t.label} (${formatBytes(result.bytesBefore)})`
      );
      removed.push(result.path);
      totalBytes += result.bytesBefore;
    } else {
      logBus.push("clean", `Skip ${t.label} — not found`);
    }
  }

  opts.onProgress?.("done", targets.length, targets.length);
  return { removed, totalBytes };
}
