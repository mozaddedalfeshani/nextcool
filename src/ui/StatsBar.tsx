import React, { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import os from "node:os";

interface CpuSnapshot {
  idle: number;
  total: number;
}

function cpuSnapshot(): CpuSnapshot {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    const times = cpu.times;
    idle += times.idle;
    total += times.idle + times.user + times.sys + times.irq + (times.nice ?? 0);
  }
  return { idle, total };
}

function cpuPct(prev: CpuSnapshot, curr: CpuSnapshot): number {
  const idleDelta = curr.idle - prev.idle;
  const totalDelta = curr.total - prev.total;
  if (totalDelta === 0) return 0;
  return Math.min(100, Math.round((1 - idleDelta / totalDelta) * 100));
}

interface Stats {
  ramUsedMb: number;
  ramTotalMb: number;
  ramPct: number;
  cpuPct: number;
}

function ramStats(): Omit<Stats, "cpuPct"> {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    ramUsedMb: Math.floor(used / 1024 / 1024),
    ramTotalMb: Math.floor(total / 1024 / 1024),
    ramPct: Math.round((used / total) * 100),
  };
}

function Bar({ pct, width = 12, danger = 85 }: { pct: number; width?: number; danger?: number }) {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  const color = pct >= danger ? "red" : pct >= 60 ? "yellow" : "green";
  return (
    <Text>
      <Text color={color}>{"█".repeat(Math.max(0, filled))}</Text>
      <Text dimColor>{"░".repeat(Math.max(0, empty))}</Text>
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
        <Bar pct={stats.ramPct} width={12} />
        <Text color={ramColor}>{stats.ramPct}%</Text>
        <Text dimColor>{fmt(stats.ramUsedMb)}/{fmt(stats.ramTotalMb)}</Text>
      </Box>
      <Box gap={1}>
        <Text dimColor>CPU</Text>
        <Bar pct={stats.cpuPct} width={12} />
        <Text color={cpuColor}>{stats.cpuPct}%</Text>
      </Box>
    </Box>
  );
}
