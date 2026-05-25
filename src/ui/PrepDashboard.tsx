import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { LogPane } from "./LogPane.js";
import type { StepState, StepStatus } from "../commands/cool.js";

interface PrepDashboardProps {
  steps: StepState[];
  done?: boolean;
  elapsedMs?: number;
}

const PHASE1 = ["lint-fix", "prettier-write"];
const PHASE2 = ["lint-strict", "prettier-check", "typecheck"];

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

function Row({ step, branch }: { step: StepState; branch?: string }) {
  const color = STATUS_COLOR[step.status];
  return (
    <Box>
      {branch ? (
        <Box marginRight={1}>
          <Text color="magenta">{branch}</Text>
        </Box>
      ) : null}
      <Box width={3} justifyContent="flex-end" marginRight={1}>
        {step.status === "running" ? (
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
        ) : (
          <Text color={color}>{STATUS_ICON[step.status]}</Text>
        )}
      </Box>
      <Box width={32}>
        <Text color={step.status === "pending" ? "gray" : "white"}>{step.label}</Text>
      </Box>
      <Box>
        {step.detail ? (
          <Text
            dimColor={step.status === "done" || step.status === "skipped"}
            color={step.status === "error" ? "red" : undefined}
          >
            {step.detail}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}

export function PrepDashboard({ steps, done, elapsedMs = 0 }: PrepDashboardProps) {
  const byId = (id: string) => steps.find((s) => s.id === id);
  const phase1 = PHASE1.map(byId).filter(Boolean) as StepState[];
  const phase2 = PHASE2.map(byId).filter(Boolean) as StepState[];

  const p2running = phase2.filter((s) => s.status === "running").length;
  const p2active = phase2.some((s) => s.status === "running");

  return (
    <Box flexDirection="column">
      {/* Phase 1 — sequential writers */}
      <Box marginTop={1}>
        <Text color="cyan" bold>
          ▸ Phase 1 · Auto-fix{"  "}
        </Text>
        <Text dimColor>sequential — edits files</Text>
      </Box>
      <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={1}>
        {phase1.map((s) => (
          <Row key={s.id} step={s} />
        ))}
      </Box>

      {/* Phase 2 — parallel checks (distinct styling) */}
      <Box marginTop={1}>
        <Text color="magenta" bold>
          ⚡ Phase 2 · Verify{"  "}
        </Text>
        <Text color={p2active ? "magenta" : "gray"} bold={p2active}>
          ∥ parallel
        </Text>
        <Text dimColor>
          {"  "}
          {p2active ? `${p2running} running at once` : "read-only"}
        </Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={p2active ? "magenta" : "gray"}
        paddingX={1}
      >
        {phase2.map((s, i) => (
          <Row key={s.id} step={s} branch={i === phase2.length - 1 ? "└─" : "├─"} />
        ))}
      </Box>

      <LogPane maxLines={6} />

      {done && (
        <Box marginTop={1}>
          <Text color="green" bold>
            ✓ Done in {(elapsedMs / 1000).toFixed(1)}s
          </Text>
        </Box>
      )}
    </Box>
  );
}
