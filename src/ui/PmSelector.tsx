import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { DetectedPm, PackageManager } from "../lib/detect-pm.js";

interface PmSelectorProps {
  detected: DetectedPm[];
  onSelect: (pm: PackageManager) => void;
  onBack: () => void;
}

export function PmSelector({ detected, onSelect, onBack }: PmSelectorProps) {
  const [cursor, setCursor] = useState(0);

  useInput((_, key) => {
    if (key.upArrow) setCursor((c) => (c - 1 + detected.length) % detected.length);
    if (key.downArrow) setCursor((c) => (c + 1) % detected.length);
    if (key.return) {
      const item = detected[cursor];
      if (item) onSelect(item.pm);
    }
    if (key.escape) onBack();
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="yellow">Multiple lockfiles detected — choose package manager:</Text>
      <Text dimColor>  ↑↓ navigate  Enter select  ESC back</Text>
      <Box flexDirection="column" marginTop={1}>
        {detected.map((item, i) => {
          const selected = i === cursor;
          return (
            <Box key={item.pm}>
              <Text color={selected ? "cyan" : "gray"}>
                {selected ? " ❯ " : "   "}
              </Text>
              <Text color={selected ? "white" : "gray"} bold={selected}>
                {item.pm}
              </Text>
              <Text dimColor>  ({item.lockfile})</Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
