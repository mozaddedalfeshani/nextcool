import React from "react";
import { Box, Text } from "ink";
import type { DoctorReport } from "../commands/doctor.js";
import { formatMb } from "../lib/system.js";

interface Props {
  report: DoctorReport;
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const color = ok === undefined ? "white" : ok ? "green" : "yellow";
  return (
    <Box>
      <Box width={28}>
        <Text dimColor>{label}</Text>
      </Box>
      <Text color={color}>{value}</Text>
    </Box>
  );
}

export function DoctorView({ report }: Props) {
  const s = report.system;

  return (
    <Box flexDirection="column">
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
        marginBottom={1}
      >
        <Text bold color="cyan">
          System
        </Text>
        <Row label="Node.js" value={`v${report.nodeMajor}.x (${report.nodeOk ? "OK" : "upgrade needed"})`} ok={report.nodeOk} />
        <Row label="Platform" value={`${s.platform} ${s.arch}`} />
        <Row label="RAM" value={`${formatMb(s.totalMemMb)} total, ${formatMb(s.freeMemMb)} free`} ok={!report.lowRam} />
        <Row label="Disk free" value={formatMb(s.freeDiskMb)} ok={!report.lowDisk} />
        <Row label="CPUs" value={`${s.cpuCount}× ${s.cpuModel.slice(0, 40)}`} />
        {s.isAppleSilicon && <Row label="Apple Silicon" value="yes (MAP_JIT leak risk)" ok={false} />}
        {s.isWsl && <Row label="WSL" value="detected" />}
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
        marginBottom={1}
      >
        <Text bold color="cyan">
          Project
        </Text>
        <Row label="Package manager" value={report.pm} />
        <Row label="Next.js" value={report.nextVersion ?? "not detected"} ok={report.isNextProject} />
        <Row label=".next size" value={report.dotNextSizeMb > 0 ? formatMb(report.dotNextSizeMb) : "empty"} ok={report.dotNextSizeMb < 500} />
        <Row label="node_modules size" value={report.nodeModulesSizeMb > 0 ? formatMb(report.nodeModulesSizeMb) : "empty"} />
        <Row label="Turbopack" value={report.hasTurbopack ? "detected" : "not detected"} />
        <Row label="Webpack fallback" value={report.hasWebpackFallback ? "yes" : "no"} />
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
        marginBottom={1}
      >
        <Text bold color="cyan">
          Processes
        </Text>
        <Row
          label="Zombie node/next"
          value={
            report.zombieCount > 0
              ? `${report.zombieCount} running, ~${formatMb(report.zombieMemMb)} RSS`
              : "none"
          }
          ok={report.zombieCount === 0}
        />
      </Box>

      {report.recommendations.length > 0 && (
        <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1}>
          <Text bold color="yellow">
            Recommendations
          </Text>
          {report.recommendations.map((r, i) => (
            <Text key={i} color="yellow">
              {" "}
              › {r}
            </Text>
          ))}
        </Box>
      )}

      {report.recommendations.length === 0 && (
        <Box>
          <Text color="green" bold>
            ✓ All checks passed. Your environment looks healthy.
          </Text>
        </Box>
      )}
    </Box>
  );
}
