import React from "react";
import { Box, Text } from "ink";
import type { FrameworkInfo } from "../lib/detect-framework.js";

const ASCII = `
 ███╗   ██╗███████╗██╗  ██╗████████╗ ██████╗ ██████╗  ██████╗ ██╗
 ████╗  ██║██╔════╝╚██╗██╔╝╚══██╔══╝██╔════╝██╔═══██╗██╔═══██╗██║
 ██╔██╗ ██║█████╗   ╚███╔╝    ██║   ██║     ██║   ██║██║   ██║██║
 ██║╚██╗██║██╔══╝   ██╔██╗    ██║   ██║     ██║   ██║██║   ██║██║
 ██║ ╚████║███████╗██╔╝ ██╗   ██║   ╚██████╗╚██████╔╝╚██████╔╝███████╗
 ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═════╝  ╚═════╝ ╚══════╝
`.trimStart();

interface BannerProps {
  version: string;
  pm: string;
  framework: FrameworkInfo;
  platform: string;
}

export function Banner({ version, pm, framework, platform }: BannerProps) {
  const fwLabel = framework.version
    ? `${framework.label} ${framework.version}`
    : framework.framework === "unknown"
      ? "no framework detected"
      : framework.label;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="column">
        {ASCII.split("\n").map((line, i) => (
          <Text key={i} color="cyan" bold>
            {line}
          </Text>
        ))}
      </Box>
      <Box>
        <Text dimColor>  v{version}  │  </Text>
        <Text color="green">{pm}</Text>
        <Text dimColor>  │  </Text>
        <Text color="yellow">{fwLabel}</Text>
        <Text dimColor>  │  </Text>
        <Text color="magenta">{platform}</Text>
      </Box>
    </Box>
  );
}
