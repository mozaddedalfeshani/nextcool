import { execa } from "execa";
import { logBus } from "../lib/log-bus.js";
import { tryWhich } from "../lib/system.js";
import { resolveBin } from "../lib/cmd.js";
import {
  detectFramework,
  resolveDevCommand,
  resolveProdCommand,
  type ResolvedCommand,
} from "../lib/detect-framework.js";

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
  label: string;
}

function wrapWithAffinity(
  resolved: ResolvedCommand,
  cores: number
): { cmd: string; args: string[]; env: NodeJS.ProcessEnv } {
  const env: NodeJS.ProcessEnv = { ...process.env };
  const bin = resolveBin(resolved.cmd);
  const baseArgs = resolved.args;

  if (process.platform === "linux" && tryWhich("taskset")) {
    return {
      cmd: "taskset",
      args: ["-c", `0-${Math.max(0, cores - 1)}`, bin, ...baseArgs],
      env,
    };
  }

  if (process.platform === "darwin" || process.platform === "linux") {
    env["UV_THREADPOOL_SIZE"] = String(cores);
    return { cmd: "nice", args: ["-n", "10", bin, ...baseArgs], env };
  }

  return {
    cmd: "cmd.exe",
    args: ["/c", bin, ...baseArgs],
    env,
  };
}

export function spawnServer(opts: RunServerOptions): ServerHandle {
  const stepId = opts.stepId ?? "server";
  const cwd = opts.cwd ?? process.cwd();
  const { cores, mode } = opts;
  const info = detectFramework(cwd);

  const resolved =
    mode === "dev" ? resolveDevCommand(cwd) : resolveProdCommand(cwd);

  if (!resolved) {
    logBus.push(stepId, `No ${mode} server command for ${info.label}. Add a "${mode === "dev" ? "dev" : "start"}" script to package.json.`);
    return {
      pid: undefined,
      label: info.label,
      async stop() {},
    };
  }

  const { cmd, args, env } = resolved.viaScript
    ? { cmd: resolved.cmd, args: resolved.args, env: { ...process.env } as NodeJS.ProcessEnv }
    : wrapWithAffinity(resolved, cores);

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

  // Windows: walk process tree and apply affinity to all descendants.
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
    label: info.label,
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
