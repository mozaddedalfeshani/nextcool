import { getSystemInfo, formatMb, getNodeMajor, tryWhich } from "../lib/system.js";
import { listNodeProcesses } from "../lib/proc.js";
import { detectPm, detectNextVersion, isNextProject } from "../lib/detect-pm.js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface DoctorReport {
  system: Awaited<ReturnType<typeof getSystemInfo>>;
  pm: string;
  nextVersion: string | null;
  isNextProject: boolean;
  nodeOk: boolean;
  nodeMajor: number;
  lowRam: boolean;
  lowDisk: boolean;
  zombieCount: number;
  zombieMemMb: number;
  hasTurbopack: boolean;
  hasWebpackFallback: boolean;
  recommendations: string[];
  dotNextSizeMb: number;
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

function detectTurbopack(cwd: string): { hasTurbopack: boolean; hasWebpackFallback: boolean } {
  const configFiles = [
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "next.config.cjs",
  ];

  for (const f of configFiles) {
    const p = join(cwd, f);
    if (!existsSync(p)) continue;
    try {
      const src = readFileSync(p, "utf8");
      const hasTurbopack =
        src.includes("turbopack") || src.includes("turbo:") || src.includes("experimental");
      const hasWebpackFallback =
        src.includes("--webpack") || src.includes("webpack");
      return { hasTurbopack, hasWebpackFallback };
    } catch {
      // ignore
    }
  }

  // check scripts in package.json
  try {
    const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const scripts = Object.values(pkg.scripts ?? {}).join(" ");
    return {
      hasTurbopack: scripts.includes("--turbo") || scripts.includes("turbopack"),
      hasWebpackFallback: scripts.includes("--webpack"),
    };
  } catch {
    return { hasTurbopack: false, hasWebpackFallback: false };
  }
}

export async function runDoctor(cwd = process.cwd()): Promise<DoctorReport> {
  const [system, procs] = await Promise.all([
    getSystemInfo(cwd),
    listNodeProcesses(),
  ]);

  const pm = detectPm(cwd);
  const nextVersion = detectNextVersion(cwd);
  const isNext = isNextProject(cwd);
  const nodeMajor = getNodeMajor();
  const nodeOk = nodeMajor >= 18;

  // Node 18.18, 20.9, 22+ are required for Next 15+
  const nextNodeOk =
    nodeMajor >= 22 ||
    (nodeMajor === 20 && parseInt(process.version.split(".")[1] ?? "0", 10) >= 9) ||
    (nodeMajor === 18 && parseInt(process.version.split(".")[1] ?? "0", 10) >= 18);

  const lowRam = system.totalMemMb < 8192;
  const lowDisk = system.freeDiskMb < 2048;

  const zombieMemMb = procs.reduce((s, p) => s + Math.floor(p.memory / 1024 / 1024), 0);

  const { hasTurbopack, hasWebpackFallback } = detectTurbopack(cwd);

  const dotNextSizeMb = await estimateDirMb(join(cwd, ".next"));
  const nodeModulesSizeMb = await estimateDirMb(join(cwd, "node_modules"));

  const recs: string[] = [];

  if (!nodeOk) recs.push(`Upgrade Node.js (have ${process.version}, need ≥18.18)`);
  if (!nextNodeOk) recs.push("Next.js 15+ requires Node ≥18.18, 20.9, or 22");

  if (procs.length > 0) {
    recs.push(`${procs.length} zombie node/next process(es) using ~${zombieMemMb} MB — run: nextcool kill`);
  }

  if (dotNextSizeMb > 500) {
    recs.push(`.next is ${formatMb(dotNextSizeMb)} — run: nextcool clean`);
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

  if (!tryWhich(pm)) {
    recs.push(`Package manager '${pm}' not found in PATH`);
  }

  return {
    system,
    pm,
    nextVersion,
    isNextProject: isNext,
    nodeOk: nextNodeOk,
    nodeMajor,
    lowRam,
    lowDisk,
    zombieCount: procs.length,
    zombieMemMb,
    hasTurbopack,
    hasWebpackFallback,
    recommendations: recs,
    dotNextSizeMb,
    nodeModulesSizeMb,
  };
}
