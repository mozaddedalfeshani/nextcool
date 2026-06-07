import { runCmd } from "../lib/exec.js";
import { logBus } from "../lib/log-bus.js";
import { resolveBin } from "../lib/cmd.js";
import { detectFramework, resolveBuildCommand } from "../lib/detect-framework.js";

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
  durationMs: number;
  commandLabel: string;
}

export async function runRebuild(opts: RebuildOptions = {}): Promise<RebuildResult> {
  const cwd = opts.cwd ?? process.cwd();
  const info = detectFramework(cwd);
  const useWebpack = info.supportsWebpackFlag && (opts.webpack ?? false);
  const resolved = resolveBuildCommand(cwd, { webpack: useWebpack });

  const env: NodeJS.ProcessEnv = { ...process.env };
  if (opts.memoryMb) {
    env["NODE_OPTIONS"] = `--max-old-space-size=${opts.memoryMb}`;
    logBus.push("rebuild", `NODE_OPTIONS=--max-old-space-size=${opts.memoryMb}`);
  }

  logBus.push("rebuild", `Running ${resolved.label}...`);

  if (opts.dryRun) {
    logBus.push("rebuild", `[dry-run] Would run: ${resolved.cmd} ${resolved.args.join(" ")}`);
    return { exitCode: 0, success: true, useWebpack, durationMs: 0, commandLabel: resolved.label };
  }

  const start = Date.now();
  const result = await runCmd("rebuild", resolveBin(resolved.cmd), resolved.args, {
    cwd,
    env,
  });
  const durationMs = Date.now() - start;

  if (result.exitCode !== 0) {
    logBus.push("rebuild", `Build failed (exit ${result.exitCode})`);
    if (info.supportsWebpackFlag && !useWebpack) {
      logBus.push("rebuild", "Tip: try --webpack flag to fall back to webpack (Next.js Turbopack fix)");
    }
  } else {
    logBus.push("rebuild", "Build complete");
  }

  return {
    exitCode: result.exitCode,
    success: result.exitCode === 0,
    useWebpack,
    durationMs,
    commandLabel: resolved.label,
  };
}
