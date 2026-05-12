import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { ServerMode } from "../commands/run-server.js";

interface CoreSelectorProps {
  totalCores: number;
  onStart: (cores: number, mode: ServerMode) => void;
  onBack: () => void;
}

export function CoreSelector({ totalCores, onStart, onBack }: CoreSelectorProps) {
  const [cores, setCores] = useState(() => Math.max(1, Math.floor(totalCores / 2)));
  const [mode, setMode] = useState<ServerMode>("dev");

  useInput((input, key) => {
    if (key.leftArrow) setCores((c) => Math.max(1, c - 1));
    if (key.rightArrow) setCores((c) => Math.min(totalCores, c + 1));
    if (input === "\t") setMode((m) => (m === "dev" ? "start" : "dev"));
    if (key.return) onStart(cores, mode);
    if (key.escape) onBack();
  });

  const filled = "█".repeat(cores);
  const empty = "░".repeat(totalCores - cores);

  return (
    <Box flexDirection="column" marginTop={1} gap={1}>
      <Text bold color="cyan">Configure Server</Text>

      <Box flexDirection="column" gap={0}>
        <Box gap={2}>
          <Text dimColor>CPU cores</Text>
          <Text>
            <Text dimColor>← </Text>
            <Text color="cyan" bold>{cores}</Text>
            <Text dimColor> →</Text>
            <Text dimColor>  of {totalCores}  </Text>
            <Text color="green">{filled}</Text>
            <Text dimColor>{empty}</Text>
          </Text>
        </Box>

        <Box gap={2}>
          <Text dimColor>Mode     </Text>
          <Text>
            <Text color={mode === "dev" ? "cyan" : "gray"} bold={mode === "dev"}>dev</Text>
            <Text dimColor> / </Text>
            <Text color={mode === "start" ? "cyan" : "gray"} bold={mode === "start"}>start</Text>
            <Text dimColor>  (Tab to toggle)</Text>
          </Text>
        </Box>
      </Box>

      {process.platform === "darwin" && (
        <Box marginTop={0}>
          <Text color="yellow">⚠ macOS: core pinning unavailable. Using UV_THREADPOOL_SIZE={cores} + nice -n 10.</Text>
        </Box>
      )}

      <Box marginTop={0}>
        <Text dimColor>Enter to start  Esc back</Text>
      </Box>
    </Box>
  );
}
