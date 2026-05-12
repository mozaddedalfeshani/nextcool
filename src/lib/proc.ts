import psList from "ps-list";

export interface NodeProcess {
  pid: number;
  name: string;
  cmd: string;
  memory: number; // bytes RSS
}

const NEXT_PATTERNS = [
  /next[\s-]?(dev|build|start|server)/i,
  /turbopack/i,
  /next-server/i,
];

const NODE_PATTERN = /^node(\.exe)?$/i;

export async function listNodeProcesses(): Promise<NodeProcess[]> {
  const all = await psList({ all: false });
  return all
    .filter(
      (p) =>
        NODE_PATTERN.test(p.name) ||
        NEXT_PATTERNS.some((re) => re.test(p.cmd ?? ""))
    )
    .map((p) => ({
      pid: p.pid,
      name: p.name,
      cmd: p.cmd ?? "",
      memory: (p as unknown as { memory?: number }).memory ?? 0,
    }));
}

export async function killProcesses(
  procs: NodeProcess[],
  dryRun = false
): Promise<{ killed: number; skipped: number }> {
  let killed = 0;
  const self = process.pid;

  const { default: fkill } = await import("fkill");

  for (const p of procs) {
    if (p.pid === self) continue;
    if (dryRun) {
      killed++;
      continue;
    }
    try {
      await fkill(p.pid, { force: true, silent: true });
      killed++;
    } catch {
      // already dead
    }
  }

  return { killed, skipped: procs.length - killed };
}
