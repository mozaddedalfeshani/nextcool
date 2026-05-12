import React, { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import os from "node:os";
import { execSync } from "node:child_process";

// ── CPU delta sampling ────────────────────────────────────────────────────────

interface CpuSnapshot { idle: number; total: number }

function cpuSnapshot(): CpuSnapshot {
  let idle = 0, total = 0;
  for (const cpu of os.cpus()) {
    const t = cpu.times;
    idle += t.idle;
    total += t.idle + t.user + t.sys + t.irq + (t.nice ?? 0);
  }
  return { idle, total };
}

function cpuPct(prev: CpuSnapshot, curr: CpuSnapshot): number {
  const di = curr.idle - prev.idle;
  const dt = curr.total - prev.total;
  if (dt === 0) return 0;
  return Math.min(100, Math.round((1 - di / dt) * 100));
}

// ── RAM — uses available (free + reclaimable cache) not just free ─────────────

function availableBytes(): number {
  // macOS: free + inactive + speculative + purgeable pages
  if (process.platform === "darwin") {
    try {
      const out = execSync("vm_stat", { encoding: "utf8" });
      const pageSize = parseInt(out.match(/page size of (\d+)/)?.[1] ?? "16384", 10);
      const pages = (key: string) =>
        parseInt(out.match(new RegExp(`${key}:\\s+(\\d+)`))?.[1] ?? "0", 10);
      return (
        pages("Pages free") +
        pages("Pages inactive") +
        pages("Pages speculative") +
        pages("Pages purgeable")
      ) * pageSize;
    } catch { /* fall through */ }
  }

  // Linux: MemAvailable from /proc/meminfo
  if (process.platform === "linux") {
    try {
      const out = execSync("grep MemAvailable /proc/meminfo", { encoding: "utf8" });
      const kb = parseInt(out.match(/(\d+)/)?.[1] ?? "0", 10);
      return kb * 1024;
    } catch { /* fall through */ }
  }

  // Windows: use wmic or PowerShell
  if (process.platform === "win32") {
    try {
      const out = execSync(
        "wmic OS get FreePhysicalMemory /Value",
        { encoding: "utf8" }
      );
      const kb = parseInt(out.match(/FreePhysicalMemory=(\d+)/)?.[1] ?? "0", 10);
      if (kb > 0) return kb * 1024;
    } catch {
      try {
        const out = execSync(
          "powershell -Command \"(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory\"",
          { encoding: "utf8" }
        );
        const kb = parseInt(out.trim(), 10);
        if (kb > 0) return kb * 1024;
      } catch { /* fall through */ }
    }
  }

  return os.freemem();
}

interface Stats {
  ramUsedMb: number;
  ramTotalMb: number;
  ramPct: number;
  cpuPct: number;
}

function ramStats(): Omit<Stats, "cpuPct"> {
  const total = os.totalmem();
  const avail = availableBytes();
  const used = total - avail;
  return {
    ramUsedMb: Math.floor(used / 1024 / 1024),
    ramTotalMb: Math.floor(total / 1024 / 1024),
    ramPct: Math.min(100, Math.round((used / total) * 100)),
  };
}

// ── UI ────────────────────────────────────────────────────────────────────────

function Bar({ pct, width = 12 }: { pct: number; width?: number }) {
  const filled = Math.round((pct / 100) * width);
  const empty = Math.max(0, width - filled);
  const color = pct >= 85 ? "red" : pct >= 60 ? "yellow" : "green";
  return (
    <Text>
      <Text color={color}>{"█".repeat(Math.max(0, filled))}</Text>
      <Text dimColor>{"░".repeat(empty)}</Text>
    </Text>
  );
}

function fmt(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)}G` : `${mb}M`;
}

export function StatsBar() {
  const prevCpu = useRef<CpuSnapshot>(cpuSnapshot());
  const [stats, setStats] = useState<Stats>({ ...ramStats(), cpuPct: 0 });

  useEffect(() => {
    const id = setInterval(() => {
      const curr = cpuSnapshot();
      const cpu = cpuPct(prevCpu.current, curr);
      prevCpu.current = curr;
      setStats({ ...ramStats(), cpuPct: cpu });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const ramColor = stats.ramPct >= 85 ? "red" : stats.ramPct >= 60 ? "yellow" : "green";
  const cpuColor = stats.cpuPct >= 85 ? "red" : stats.cpuPct >= 60 ? "yellow" : "green";

  return (
    <Box marginBottom={1} gap={3}>
      <Box gap={1}>
        <Text dimColor>RAM</Text>
        <Bar pct={stats.ramPct} />
        <Text color={ramColor}>{stats.ramPct}%</Text>
        <Text dimColor>{fmt(stats.ramUsedMb)}/{fmt(stats.ramTotalMb)}</Text>
      </Box>
      <Box gap={1}>
        <Text dimColor>CPU</Text>
        <Bar pct={stats.cpuPct} />
        <Text color={cpuColor}>{stats.cpuPct}%</Text>
      </Box>
    </Box>
  );
}
