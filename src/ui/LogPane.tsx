import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { logBus, type LogLine } from "../lib/log-bus.js";

interface LogPaneProps {
  maxLines?: number;
  stepId?: string;
}

export function LogPane({ maxLines = 6, stepId }: LogPaneProps) {
  const [lines, setLines] = useState<LogLine[]>([]);

  useEffect(() => {
    const handler = (line: LogLine) => {
      if (stepId && line.stepId !== stepId) return;
      setLines((prev) => {
        const next = [...prev, line];
        return next.slice(-maxLines);
      });
    };

    logBus.on("line", handler);
    return () => {
      logBus.off("line", handler);
    };
  }, [maxLines, stepId]);

  if (lines.length === 0) return null;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} marginTop={1}>
      <Text dimColor bold>
        logs
      </Text>
      {lines.map((l, i) => (
        <Text key={i} dimColor wrap="truncate">
          <Text color="gray">[{l.stepId}] </Text>
          {l.text}
        </Text>
      ))}
    </Box>
  );
}
