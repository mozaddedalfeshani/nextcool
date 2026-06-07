import { getSystemInfo, formatMb, getNodeMajor, tryWhich } from "../lib/system.js";
import { listNodeProcesses } from "../lib/proc.js";
import { detectPm } from "../lib/detect-pm.js";
import {
  detectFramework,
  detectTurbopack,
  getBuildOutputPaths,
  type ReactFramework,
} from "../lib/detect-framework.js";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface DoctorReport {
  system: Awaited<ReturnType<typeof getSystemInfo>>;
  pm: string;
  framework: ReactFramework;
  frameworkLabel: string;
  frameworkVersion: string | null;
  isReactProject: boolean;
  nodeOk: boolean;
  nodeMajor: number;
  lowRam: boolean;
  lowDisk: boolean;
  zombieCount: number;
  zombieMemMb: number;
  hasTurbopack: boolean;
  hasWebpackFallback: boolean;
  recommendations: string[];
  buildOutputSizeMb: number;
  nodeModulesSizeMb: number;
}

async function estimateDirMb(dir: string): Promise<number> {
  if (!existsSync(dir)) return 0;
  try {
    const { default: getFolderSize } = await import("get-folder-size");
    const bytes = await getFolderSize.loose(dir);
    return Math.floor(bytes / 1024 / 1024);
  } catch {
    return 0;
  }
}

export async function runDoctor(cwd = process.cwd()): Promise<DoctorReport> {
  const [system, procs] = await Promise.all([
    getSystemInfo(cwd),
    listNodeProcesses(),
  ]);

  const pm = detectPm(cwd);
  const fw = detectFramework(cwd);
  const nodeMajor = getNodeMajor();
  const nodeOk = nodeMajor >= 18;

  const nextNodeOk =
    nodeMajor >= 22 ||
    (nodeMajor === 20 && parseInt(process.version.split(".")[1] ?? "0", 10) >= 9) ||
    (nodeMajor === 18 && parseInt(process.version.split(".")[1] ?? "0", 10) >= 18);

  const lowRam = system.totalMemMb < 8192;
  const lowDisk = system.freeDiskMb < 2048;

  const zombieMemMb = procs.reduce((s, p) => s + Math.floor(p.memory / 1024 / 1024), 0);

  const { hasTurbopack, hasWebpackFallback } = detectTurbopack(cwd);
  const outputPaths = getBuildOutputPaths(cwd);

  const buildOutputSizeMb = await estimateDirMb(join(cwd, outputPaths.outputDir));
  const nodeModulesSizeMb = await estimateDirMb(join(cwd, "node_modules"));

  const recs: string[] = [];

  if (!nodeOk) recs.push(`Upgrade Node.js (have ${process.version}, need ≥18.18)`);
  if (fw.framework === "next" && !nextNodeOk) {
    recs.push("Next.js 15+ requires Node ≥18.18, 20.9, or 22");
  }

  if (procs.length > 0) {
    recs.push(`${procs.length} zombie node process(es) using ~${zombieMemMb} MB — run: nextcool kill`);
  }

  if (buildOutputSizeMb > 500) {
    recs.push(`${outputPaths.outputDir} is ${formatMb(buildOutputSizeMb)} — run: nextcool clean`);
  }

  if (lowRam) {
    recs.push(
      `Low RAM (${formatMb(system.totalMemMb)}) — add NODE_OPTIONS=--max-old-space-size=4096 or use: nextcool cool --memory 4096`
    );
  }

  if (lowDisk) {
    recs.push(`Low disk space (${formatMb(system.freeDiskMb)} free) — run: nextcool cool --full`);
  }

  if (system.isAppleSilicon && hasTurbopack) {
    recs.push(
      "Apple Silicon + Turbopack: known MAP_JIT memory leak (vercel/next.js#81161). Use: nextcool cool --webpack"
    );
  }

  if (hasTurbopack && !hasWebpackFallback) {
    recs.push("Turbopack detected. If CPU spikes, try: nextcool cool --webpack");
  }

  if (fw.framework === "unknown") {
    recs.push("No React framework detected — add react or a framework to package.json, or use --force");
  }

  if (!tryWhich(pm)) {
    recs.push(`Package manager '${pm}' not found in PATH`);
  }

  return {
    system,
    pm,
    framework: fw.framework,
    frameworkLabel: fw.label,
    frameworkVersion: fw.version,
    isReactProject: fw.framework !== "unknown",
    nodeOk: fw.framework === "next" ? nextNodeOk : nodeOk,
    nodeMajor,
    lowRam,
    lowDisk,
    zombieCount: procs.length,
    zombieMemMb,
    hasTurbopack,
    hasWebpackFallback,
    recommendations: recs,
    buildOutputSizeMb,
    nodeModulesSizeMb,
  };
}
