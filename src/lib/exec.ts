import { execa, type Options as ExecaOptions } from "execa";
import { logBus } from "./log-bus.js";

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runCmd(
  stepId: string,
  cmd: string,
  args: string[],
  opts: ExecaOptions & { cwd?: string } = {}
): Promise<ExecResult> {
  const proc = execa(cmd, args, {
    ...opts,
    cwd: opts.cwd ?? process.cwd(),
    reject: false,
    all: true,
  });

  const lines: string[] = [];

  proc.all?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    for (const line of text.split("\n")) {
      if (line.trim()) {
        logBus.push(stepId, line);
        lines.push(line);
      }
    }
  });

  const result = await proc;
  return {
    exitCode: result.exitCode ?? 0,
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : "",
  };
}
