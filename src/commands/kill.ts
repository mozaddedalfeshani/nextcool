import { listNodeProcesses, killProcesses } from "../lib/proc.js";
import { logBus } from "../lib/log-bus.js";

export interface KillResult {
  found: number;
  killed: number;
  totalMemoryMb: number;
}

export async function runKill(opts: { dryRun?: boolean } = {}): Promise<KillResult> {
  const procs = await listNodeProcesses();

  if (procs.length === 0) {
    logBus.push("kill", "No node/next processes found");
    return { found: 0, killed: 0, totalMemoryMb: 0 };
  }

  const totalMemory = procs.reduce((sum, p) => sum + p.memory, 0);
  const totalMemoryMb = Math.floor(totalMemory / 1024 / 1024);

  for (const p of procs) {
    const memMb = Math.floor(p.memory / 1024 / 1024);
    logBus.push("kill", `  pid ${p.pid} — ${p.name} — ${memMb} MB`);
  }

  const { killed } = await killProcesses(procs, opts.dryRun);

  if (opts.dryRun) {
    logBus.push("kill", `[dry-run] Would kill ${procs.length} process(es)`);
  } else {
    logBus.push("kill", `Killed ${killed} process(es), freed ~${totalMemoryMb} MB RSS`);
  }

  return { found: procs.length, killed, totalMemoryMb };
}
