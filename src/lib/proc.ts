import psList from "ps-list";

export interface NodeProcess {
  pid: number;
  name: string;
  cmd: string;
  memory: number;
}

const DEV_PATTERNS = [
  /next[\s-]?(dev|build|start|server)/i,
  /turbopack/i,
  /next-server/i,
  /vite(\s|$)/i,
  /webpack-dev-server/i,
  /react-scripts\s+(start|build)/i,
  /expo\s+start/i,
  /react-native\s+start/i,
  /remix\s+dev/i,
  /gatsby\s+(develop|serve)/i,
  /astro\s+dev/i,
  /electron(\.exe)?(\s|$)/i,
  /metro(\.exe)?(\s|$)/i,
];

const NODE_PATTERN = /^node(\.exe)?$/i;

export async function listNodeProcesses(): Promise<NodeProcess[]> {
  const all = await psList({ all: false });
  return all
    .filter(
      (p) =>
        NODE_PATTERN.test(p.name) ||
        DEV_PATTERNS.some((re) => re.test(p.cmd ?? ""))
    )
    .map((p) => {
      // ps-list returns memory in bytes on macOS/Linux
      // on Windows the field may be absent or in KB — normalise to bytes
      const raw = (p as unknown as { memory?: number }).memory ?? 0;
      const memBytes = process.platform === "win32" && raw > 0 && raw < 1_000_000
        ? raw * 1024  // Windows returns KB
        : raw;
      return {
        pid: p.pid,
        name: p.name,
        cmd: p.cmd ?? "",
        memory: memBytes,
      };
    });
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
    if (dryRun) { killed++; continue; }
    try {
      await fkill(p.pid, { force: true, silent: true });
      killed++;
    } catch {
      // already dead
    }
  }

  return { killed, skipped: procs.length - killed };
}
