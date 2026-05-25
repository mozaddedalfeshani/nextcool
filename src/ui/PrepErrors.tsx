import React from "react";
import { Box, Text } from "ink";
import type { FailedTask } from "../commands/prep.js";

interface PrepErrorsProps {
  failed: FailedTask[];
}

/**
 * Deferred end-of-run error dump: one section per failed task, showing its
 * captured console output. Nothing is highlighted while tasks run — this is the
 * single place failures surface.
 */
export function PrepErrors({ failed }: PrepErrorsProps) {
  if (failed.length === 0) return null;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="red" paddingX={1} marginTop={1}>
      <Text color="red" bold>
        ✗ {failed.length} task(s) failed:
      </Text>
      {failed.map((t) => (
        <Box key={t.id} flexDirection="column" marginTop={1}>
          <Text color="red" bold>
            {t.label}
          </Text>
          {t.lines.length > 0 ? (
            t.lines.map((line, i) => (
              <Text key={i} dimColor>
                {"  "}
                {line}
              </Text>
            ))
          ) : (
            <Text dimColor>  (no output captured)</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
