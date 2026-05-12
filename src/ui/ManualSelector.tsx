import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

export interface StepOption {
  id: string;
  label: string;
  desc: string;
  defaultOn: boolean;
}

export const STEP_OPTIONS: StepOption[] = [
  { id: "kill",    label: "Kill processes",       desc: "kill all node/next processes",          defaultOn: true },
  { id: "clean",   label: "Clean artifacts",      desc: "remove .next, .turbo, .swc, caches",   defaultOn: true },
  { id: "purge",   label: "Purge PM cache",       desc: "bun/pnpm/npm/yarn global cache wipe",  defaultOn: true },
  { id: "install", label: "Reinstall deps",       desc: "run install with detected PM",         defaultOn: true },
  { id: "build",   label: "Rebuild project",      desc: "run next build",                       defaultOn: true },
  { id: "full",    label: "Also delete node_modules", desc: "nukes node_modules (use with reinstall)", defaultOn: false },
  { id: "webpack", label: "Use --webpack flag",   desc: "fall back to webpack (Turbopack fix)", defaultOn: false },
];

export interface ManualSelection {
  kill: boolean;
  clean: boolean;
  purge: boolean;
  install: boolean;
  build: boolean;
  full: boolean;
  webpack: boolean;
}

interface ManualSelectorProps {
  onConfirm: (sel: ManualSelection) => void;
  onBack: () => void;
}

export function ManualSelector({ onConfirm, onBack }: ManualSelectorProps) {
  const [cursor, setCursor] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(STEP_OPTIONS.map((o) => [o.id, o.defaultOn]))
  );

  useInput((_, key) => {
    if (key.upArrow) setCursor((c) => (c - 1 + STEP_OPTIONS.length) % STEP_OPTIONS.length);
    if (key.downArrow) setCursor((c) => (c + 1) % STEP_OPTIONS.length);

    if (_ === " ") {
      const opt = STEP_OPTIONS[cursor];
      if (opt) setChecked((prev) => ({ ...prev, [opt.id]: !prev[opt.id] }));
    }

    if (key.return) {
      onConfirm(checked as unknown as ManualSelection);
    }

    if (key.escape) onBack();
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="cyan">
        Select steps:
      </Text>
      <Text dimColor>  ↑↓ navigate  Space toggle  Enter run  Esc back</Text>
      <Box flexDirection="column" marginTop={1}>
        {STEP_OPTIONS.map((opt, i) => {
          const active = i === cursor;
          const on = checked[opt.id];
          return (
            <Box key={opt.id}>
              <Text color={active ? "cyan" : "gray"}>
                {active ? " ❯ " : "   "}
              </Text>
              <Text color={on ? "green" : "gray"}>
                {on ? "◉" : "○"}
              </Text>
              <Text> </Text>
              <Text color={active ? "white" : on ? "white" : "gray"} bold={active}>
                {opt.label}
              </Text>
              <Text dimColor>  {opt.desc}</Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press </Text>
        <Text color="green">Enter</Text>
        <Text dimColor> to run selected steps</Text>
      </Box>
    </Box>
  );
}
