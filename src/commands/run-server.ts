import { execa } from "execa";
import { logBus } from "../lib/log-bus.js";
import { resolveBin } from "../lib/cmd.js";
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
    args = ["-c", `0-${Math.max(0, cores - 1)}`, resolveBin("npx"), "next", mode];
  } else if (process.platform === "darwin" || process.platform === "linux") {
    cmd = "nice";
    args = ["-n", "10", resolveBin("npx"), "next", mode];
    env["UV_THREADPOOL_SIZE"] = String(cores);
  } else {
    // Windows
    cmd = resolveBin("npx");
    args = ["next", mode];
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

  // Windows: set CPU affinity after spawn
  if (process.platform === "win32" && proc.pid) {
    const mask = (1 << cores) - 1;
    setTimeout(() => {
      execa("powershell", [
        "-Command",
        `try { (Get-Process -Id ${proc.pid}).ProcessorAffinity = [IntPtr]${mask} } catch {}`,
      ]).catch(() => {});
    }, 50);
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
