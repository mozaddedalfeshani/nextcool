import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";

export type RunnerOs = "linux" | "windows" | "mac";

export interface ActionRunnerOptions {
  cwd?: string;
  os?: RunnerOs; // explicit override; defaults to host os
  uninstall?: boolean;
}

export interface ActionRunnerResult {
  action: "installed" | "uninstalled" | "missing";
  path: string;
  os: RunnerOs;
}

const WORKFLOW_REL = join(".github", "workflows", "nextcool.yml");

const RUNNER_LABEL: Record<RunnerOs, string> = {
  linux: "ubuntu-latest",
  windows: "windows-latest",
  mac: "macos-latest",
};

export function detectHostOs(): RunnerOs {
  switch (process.platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "mac";
    default:
      return "linux";
  }
}

function buildWorkflow(os: RunnerOs): string {
  return `name: nextcool
on:
  push:
  workflow_dispatch:

jobs:
  build:
    runs-on: ${RUNNER_LABEL[os]}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: nextcool fullclean
        run: npx --yes nextcool fullclean --yes --force
`;
}

export function runActionRunner(
  opts: ActionRunnerOptions = {}
): ActionRunnerResult {
  const cwd = opts.cwd ?? process.cwd();
  const os = opts.os ?? detectHostOs();
  const path = join(cwd, WORKFLOW_REL);

  if (opts.uninstall) {
    if (existsSync(path)) {
      rmSync(path);
      return { action: "uninstalled", path, os };
    }
    return { action: "missing", path, os };
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buildWorkflow(os), "utf8");
  return { action: "installed", path, os };
}
