import { runCmd } from "../lib/exec.js";
import { logBus } from "../lib/log-bus.js";

export interface RebuildOptions {
  dryRun?: boolean;
  cwd?: string;
  webpack?: boolean;
  memoryMb?: number;
}

export interface RebuildResult {
  exitCode: number;
  success: boolean;
  useWebpack: boolean;
}

export async function runRebuild(opts: RebuildOptions = {}): Promise<RebuildResult> {
  const useWebpack = opts.webpack ?? false;
  const args = ["build"];
  if (useWebpack) args.push("--no-turbo");

  const env: NodeJS.ProcessEnv = { ...process.env };
  if (opts.memoryMb) {
    env["NODE_OPTIONS"] = `--max-old-space-size=${opts.memoryMb}`;
    logBus.push("rebuild", `NODE_OPTIONS=--max-old-space-size=${opts.memoryMb}`);
  }

  logBus.push("rebuild", `Running next build${useWebpack ? " (webpack mode)" : " (turbopack)"}...`);

  if (opts.dryRun) {
    logBus.push("rebuild", `[dry-run] Would run: next ${args.join(" ")}`);
    return { exitCode: 0, success: true, useWebpack };
  }

  const result = await runCmd("rebuild", "npx", ["next", ...args], {
    cwd: opts.cwd,
    env,
  });

  if (result.exitCode !== 0) {
    logBus.push("rebuild", `Build failed (exit ${result.exitCode})`);
    if (!useWebpack) {
      logBus.push("rebuild", "Tip: try --webpack flag to fall back to webpack (known Turbopack fix)");
    }
  } else {
    logBus.push("rebuild", "Build complete");
  }

  return { exitCode: result.exitCode, success: result.exitCode === 0, useWebpack };
}
