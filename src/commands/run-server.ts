import { execa } from "execa";
import { logBus } from "../lib/log-bus.js";
import { tryWhich } from "../lib/system.js";

export type ServerMode = "dev" | "start";

export interface RunServerOptions {
  cores: number;
  mode: ServerMode;
  cwd?: string;
  stepId?: string;
}

export interface ServerHandle {
  pid: number | undefined;
  stop: () => Promise<void>;
}

export function spawnServer(opts: RunServerOptions): ServerHandle {
  const stepId = opts.stepId ?? "server";
  const cwd = opts.cwd ?? process.cwd();
  const { cores, mode } = opts;

  let cmd: string;
  let args: string[];
  const env: NodeJS.ProcessEnv = { ...process.env };

  if (process.platform === "linux" && tryWhich("taskset")) {
    cmd = "taskset";
    args = ["-c", `0-${Math.max(0, cores - 1)}`, "npx", "next", mode];
  } else if (process.platform === "darwin" || process.platform === "linux") {
    cmd = "nice";
    args = ["-n", "10", "npx", "next", mode];
    env["UV_THREADPOOL_SIZE"] = String(cores);
  } else {
    // Windows: .cmd scripts must run inside cmd.exe
    cmd = "cmd.exe";
    args = ["/c", "npx", "next", mode];
  }

  const proc = execa(cmd, args, {
    cwd,
    env,
    reject: false,
    all: true,
  });

  proc.all?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString().split("\n")) {
      if (line.trim()) logBus.push(stepId, line);
    }
  });

  // Windows: walk process tree rooted at cmd.exe and apply affinity to all descendants.
  // 3s delay gives Next.js time to spawn turbopack/router workers before we pin them.
  if (process.platform === "win32" && proc.pid) {
    const mask = (1 << cores) - 1;
    const rootPid = proc.pid;
    setTimeout(() => {
      const script = `$mask = [IntPtr]${mask}; function Set-TreeAffinity($id) { Get-CimInstance Win32_Process -Filter "ParentProcessId = $id" | ForEach-Object { try { (Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue).ProcessorAffinity = $mask } catch {}; Set-TreeAffinity $_.ProcessId } }; Set-TreeAffinity ${rootPid}`;
      execa("powershell", ["-Command", script]).catch(() => {});
    }, 3000);
  }

  return {
    get pid() {
      return proc.pid;
    },
    async stop() {
      if (proc.pid) {
        try {
          const { default: fkill } = await import("fkill");
          await fkill(proc.pid, { force: true, tree: true, silent: true });
        } catch {
          // already dead
        }
      }
    },
  };
}
