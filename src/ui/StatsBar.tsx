import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import os from "node:os";

interface Stats {
  ramUsedMb: number;
  ramTotalMb: number;
  ramPct: number;
  cpuLoad: number; // 0–100
}

function sample(): Stats {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const ramPct = Math.round((used / total) * 100);
  const load1 = os.loadavg()[0] ?? 0;
  const cpuCount = os.cpus().length;
  const cpuLoad = Math.min(100, Math.round((load1 / cpuCount) * 100));
  return {
    ramUsedMb: Math.floor(used / 1024 / 1024),
    ramTotalMb: Math.floor(total / 1024 / 1024),
    ramPct,
    cpuLoad,
  };
}

function Bar({ pct, width = 10, danger = 85 }: { pct: number; width?: number; danger?: number }) {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  const color = pct >= danger ? "red" : pct >= 60 ? "yellow" : "green";
  return (
    <Text>
      <Text color={color}>{"█".repeat(filled)}</Text>
      <Text dimColor>{"░".repeat(empty)}</Text>
    </Text>
  );
}

function fmt(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)}G` : `${mb}M`;
}

export function StatsBar() {
  const [stats, setStats] = useState<Stats>(sample);

  useEffect(() => {
    const id = setInterval(() => setStats(sample()), 1000);
    return () => clearInterval(id);
  }, []);

  const ramColor = stats.ramPct >= 85 ? "red" : stats.ramPct >= 60 ? "yellow" : "green";
  const cpuColor = stats.cpuLoad >= 85 ? "red" : stats.cpuLoad >= 60 ? "yellow" : "green";

  return (
    <Box marginBottom={1} gap={3}>
      <Box gap={1}>
        <Text dimColor>RAM</Text>
        <Bar pct={stats.ramPct} width={12} />
        <Text color={ramColor}>
          {stats.ramPct}%
        </Text>
        <Text dimColor>
          {fmt(stats.ramUsedMb)}/{fmt(stats.ramTotalMb)}
        </Text>
      </Box>
      <Box gap={1}>
        <Text dimColor>CPU</Text>
        <Bar pct={stats.cpuLoad} width={12} />
        <Text color={cpuColor}>{stats.cpuLoad}%</Text>
        <Text dimColor>load {(os.loadavg()[0] ?? 0).toFixed(2)}</Text>
      </Box>
    </Box>
  );
}
