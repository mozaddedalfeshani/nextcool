import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

export type MenuChoice = "auto" | "manual" | "doctor" | "quit";

interface MainMenuProps {
  onSelect: (choice: MenuChoice) => void;
}

const OPTIONS: { label: string; value: MenuChoice; desc: string }[] = [
  { value: "auto", label: "Auto cool", desc: "kill → clean → purge cache → reinstall → rebuild" },
  { value: "manual", label: "Manual", desc: "choose which steps to run" },
  { value: "doctor", label: "Doctor", desc: "diagnose environment, no changes" },
  { value: "quit", label: "Quit", desc: "" },
];

export function MainMenu({ onSelect }: MainMenuProps) {
  const [cursor, setCursor] = useState(0);

  useInput((_, key) => {
    if (key.upArrow) setCursor((c) => (c - 1 + OPTIONS.length) % OPTIONS.length);
    if (key.downArrow) setCursor((c) => (c + 1) % OPTIONS.length);
    if (key.return) {
      const opt = OPTIONS[cursor];
      if (opt) onSelect(opt.value);
    }
    if (key.escape || (key.ctrl && _.toLowerCase() === "c")) onSelect("quit");
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="cyan">
        What do you want to do?
      </Text>
      <Text dimColor>  ↑↓ navigate  Enter select</Text>
      <Box flexDirection="column" marginTop={1}>
        {OPTIONS.map((opt, i) => {
          const selected = i === cursor;
          return (
            <Box key={opt.value}>
              <Text color={selected ? "cyan" : "gray"}>
                {selected ? " ❯ " : "   "}
              </Text>
              <Text color={selected ? "white" : "gray"} bold={selected}>
                {opt.label}
              </Text>
              {opt.desc ? (
                <Text dimColor>  — {opt.desc}</Text>
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
