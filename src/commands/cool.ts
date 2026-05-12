import { runKill } from "./kill.js";
import { runClean } from "./clean.js";
import { runPurgeCache } from "./purge-cache.js";
import { runReinstall } from "./reinstall.js";
import { runRebuild } from "./rebuild.js";
import { detectPm, type PackageManager } from "../lib/detect-pm.js";
import { logBus } from "../lib/log-bus.js";

export type StepStatus = "pending" | "running" | "done" | "error" | "skipped";

export interface StepState {
  id: string;
  label: string;
  status: StepStatus;
  detail: string;
}

export interface CoolOptions {
  dryRun?: boolean;
  full?: boolean;
  webpack?: boolean;
  memoryMb?: number;
  skipKill?: boolean;
  skipInstall?: boolean;
  skipBuild?: boolean;
  cwd?: string;
  pm?: PackageManager;
  onStep?: (steps: StepState[]) => void;
}

export interface CoolResult {
  steps: StepState[];
  success: boolean;
  totalReclaimedBytes: number;
  killedProcesses: number;
  freedMemoryMb: number;
  elapsedMs: number;
}

export async function runCool(opts: CoolOptions = {}): Promise<CoolResult> {
  const cwd = opts.cwd ?? process.cwd();
  const pm = opts.pm ?? detectPm(cwd);
  const start = Date.now();

  const steps: StepState[] = [
    { id: "kill", label: "Kill node/next processes", status: "pending", detail: "" },
    { id: "clean", label: "Remove build artifacts", status: "pending", detail: "" },
    { id: "purge", label: `Purge ${pm} cache`, status: "pending", detail: "" },
    { id: "install", label: "Reinstall dependencies", status: "pending", detail: "" },
    { id: "build", label: "Rebuild project", status: "pending", detail: "" },
  ];

  function setStep(id: string, status: StepStatus, detail: string) {
    const step = steps.find((s) => s.id === id);
    if (step) {
      step.status = status;
      step.detail = detail;
    }
    opts.onStep?.([...steps]);
  }

  let totalReclaimedBytes = 0;
  let killedProcesses = 0;
  let freedMemoryMb = 0;

  // Step 1: kill
  if (!opts.skipKill) {
    setStep("kill", "running", "scanning processes...");
    try {
      const r = await runKill({ dryRun: opts.dryRun });
      killedProcesses = r.killed;
      freedMemoryMb = r.totalMemoryMb;
      setStep(
        "kill",
        "done",
        r.killed > 0
          ? `${r.killed} killed, ~${r.totalMemoryMb} MB freed`
          : "none found"
      );
    } catch (e) {
      logBus.push("kill", `Error: ${String(e)}`);
      setStep("kill", "error", String(e));
    }
  } else {
    setStep("kill", "skipped", "");
  }

  // Step 2: clean artifacts
  setStep("clean", "running", "scanning...");
  try {
    const r = await runClean({ dryRun: opts.dryRun, full: opts.full, cwd });
    totalReclaimedBytes += r.totalBytes;
    const mb = Math.floor(r.totalBytes / 1024 / 1024);
    setStep("clean", "done", mb > 0 ? `${mb} MB removed` : "nothing to remove");
  } catch (e) {
    logBus.push("clean", `Error: ${String(e)}`);
    setStep("clean", "error", String(e));
  }

  // Step 3: purge PM cache
  setStep("purge", "running", `running ${pm} cache clean...`);
  try {
    const r = await runPurgeCache(pm, { dryRun: opts.dryRun });
    setStep("purge", r.success ? "done" : "error", r.success ? "cache cleared" : `exit ${r.exitCode}`);
  } catch (e) {
    logBus.push("purge", `Error: ${String(e)}`);
    setStep("purge", "error", String(e));
  }

  // Step 4: reinstall
  if (!opts.skipInstall) {
    setStep("install", "running", "installing...");
    try {
      const r = await runReinstall(pm, { dryRun: opts.dryRun, cwd });
      setStep("install", r.success ? "done" : "error", r.success ? "done" : `exit ${r.exitCode}`);
    } catch (e) {
      logBus.push("install", `Error: ${String(e)}`);
      setStep("install", "error", String(e));
    }
  } else {
    setStep("install", "skipped", "");
  }

  // Step 5: rebuild
  if (!opts.skipBuild) {
    setStep("build", "running", opts.webpack ? "webpack mode..." : "turbopack...");
    try {
      const r = await runRebuild({
        dryRun: opts.dryRun,
        cwd,
        webpack: opts.webpack,
        memoryMb: opts.memoryMb,
      });
      setStep("build", r.success ? "done" : "error", r.success ? "build complete" : `exit ${r.exitCode}`);
    } catch (e) {
      logBus.push("build", `Error: ${String(e)}`);
      setStep("build", "error", String(e));
    }
  } else {
    setStep("build", "skipped", "");
  }

  const success = steps.every((s) => s.status === "done" || s.status === "skipped");

  return {
    steps,
    success,
    totalReclaimedBytes,
    killedProcesses,
    freedMemoryMb,
    elapsedMs: Date.now() - start,
  };
}
