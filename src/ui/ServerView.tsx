import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { LogPane } from "./LogPane.js";
import type { ServerHandle, ServerMode } from "../commands/run-server.js";

interface ServerViewProps {
  handle: ServerHandle;
  cores: number;
  totalCores: number;
  mode: ServerMode;
  onStop: () => void;
}

type Status = "running" | "stopping" | "stopped";

export function ServerView({ handle, cores, totalCores, mode, onStop }: ServerViewProps) {
  const [status, setStatus] = useState<Status>("running");

  useInput(
    (_, key) => {
      if (key.escape) {
        setStatus("stopping");
        void handle.stop().then(() => setStatus("stopped"));
      }
    },
    { isActive: status === "running" }
  );

  useEffect(() => {
    if (status !== "stopped") return;
    const t = setTimeout(() => onStop(), 1500);
    return () => clearTimeout(t);
  }, [status, onStop]);

  const statusColor = status === "running" ? "green" : status === "stopping" ? "yellow" : "red";
  const statusLabel = status === "running" ? "running" : status === "stopping" ? "stopping..." : "stopped";

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box gap={2}>
        <Text bold color="cyan">Next.js</Text>
        <Text color="white">[{mode}]</Text>
        <Text dimColor>{cores}/{totalCores} cores</Text>
        <Text color={statusColor} bold>{statusLabel}</Text>
        {status === "running" && <Text dimColor>(ESC to stop)</Text>}
      </Box>

      <LogPane stepId="server" maxLines={20} />

      {status === "stopped" && (
        <Box marginTop={1}>
          <Text color="green">✓ Server stopped. Returning to menu...</Text>
        </Box>
      )}
    </Box>
  );
}
