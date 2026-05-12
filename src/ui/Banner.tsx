import React from "react";
import { Box, Text } from "ink";

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
  nextVersion: string | null;
  platform: string;
}

export function Banner({ version, pm, nextVersion, platform }: BannerProps) {
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
        {nextVersion ? (
          <Text color="yellow">next {nextVersion}</Text>
        ) : (
          <Text dimColor>no next detected</Text>
        )}
        <Text dimColor>  │  </Text>
        <Text color="magenta">{platform}</Text>
      </Box>
    </Box>
  );
}
