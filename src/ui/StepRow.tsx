import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { StepStatus } from "../commands/cool.js";

const STATUS_ICON: Record<StepStatus, string> = {
  pending: "·",
  running: "",
  done: "✓",
  error: "✗",
  skipped: "–",
};

const STATUS_COLOR: Record<StepStatus, string> = {
  pending: "gray",
  running: "cyan",
  done: "green",
  error: "red",
  skipped: "gray",
};

interface StepRowProps {
  label: string;
  status: StepStatus;
  detail?: string;
}

export function StepRow({ label, status, detail }: StepRowProps) {
  const color = STATUS_COLOR[status];

  return (
    <Box>
      <Box width={3} justifyContent="flex-end" marginRight={1}>
        {status === "running" ? (
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
        ) : (
          <Text color={color}>{STATUS_ICON[status]}</Text>
        )}
      </Box>
      <Box width={34}>
        <Text color={status === "pending" ? "gray" : "white"}>{label}</Text>
      </Box>
      <Box>
        {detail ? (
          <Text dimColor={status === "done" || status === "skipped"} color={status === "error" ? "red" : undefined}>
            {detail}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}
