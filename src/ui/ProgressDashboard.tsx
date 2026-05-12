import React from "react";
import { Box, Text } from "ink";
import { StepRow } from "./StepRow.js";
import { LogPane } from "./LogPane.js";
import type { StepState } from "../commands/cool.js";
import { formatBytes } from "../lib/system.js";

interface ProgressDashboardProps {
  steps: StepState[];
  done?: boolean;
  totalReclaimedBytes?: number;
  killedProcesses?: number;
  elapsedMs?: number;
}

export function ProgressDashboard({
  steps,
  done,
  totalReclaimedBytes = 0,
  killedProcesses = 0,
  elapsedMs = 0,
}: ProgressDashboardProps) {
  return (
    <Box flexDirection="column">
      <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={1}>
        {steps.map((s) => (
          <StepRow key={s.id} label={s.label} status={s.status} detail={s.detail} />
        ))}
      </Box>

      <LogPane maxLines={6} />

      {done && (
        <Box marginTop={1} flexDirection="column">
          <Text color="green" bold>
            ✓ Done in {(elapsedMs / 1000).toFixed(1)}s
          </Text>
          {totalReclaimedBytes > 0 && (
            <Text dimColor>  Reclaimed: {formatBytes(totalReclaimedBytes)}</Text>
          )}
          {killedProcesses > 0 && (
            <Text dimColor>  Killed:    {killedProcesses} process(es)</Text>
          )}
        </Box>
      )}
    </Box>
  );
}
