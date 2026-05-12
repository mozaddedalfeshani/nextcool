import os from "node:os";
import { execSync } from "node:child_process";
import checkDiskSpace from "check-disk-space";

export interface SystemInfo {
  platform: NodeJS.Platform;
  arch: string;
  nodeVersion: string;
  totalMemMb: number;
  freeMemMb: number;
  cpuCount: number;
  cpuModel: string;
  isAppleSilicon: boolean;
  isWsl: boolean;
  freeDiskMb: number;
}

export async function getSystemInfo(cwd = process.cwd()): Promise<SystemInfo> {
  const total = os.totalmem();
  const free = os.freemem();
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model ?? "unknown";
  const isAppleSilicon =
    process.platform === "darwin" && process.arch === "arm64";

  const isWsl = (() => {
    try {
      const release = os.release().toLowerCase();
      return release.includes("microsoft") || release.includes("wsl");
    } catch {
      return false;
    }
  })();

  let freeDiskMb = 0;
  try {
    const disk = await checkDiskSpace(cwd);
    freeDiskMb = Math.floor(disk.free / 1024 / 1024);
  } catch {
    // ignore
  }

  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    totalMemMb: Math.floor(total / 1024 / 1024),
    freeMemMb: Math.floor(free / 1024 / 1024),
    cpuCount: cpus.length,
    cpuModel,
    isAppleSilicon,
    isWsl,
    freeDiskMb,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

export function getNodeMajor(): number {
  return parseInt(process.version.slice(1).split(".")[0] ?? "0", 10);
}

export function tryWhich(cmd: string): boolean {
  try {
    execSync(
      process.platform === "win32" ? `where ${cmd}` : `which ${cmd}`,
      { stdio: "ignore" }
    );
    return true;
  } catch {
    return false;
  }
}
