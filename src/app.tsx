import React, { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { Banner } from "./ui/Banner.js";
import { ProgressDashboard } from "./ui/ProgressDashboard.js";
import { DoctorView } from "./ui/DoctorView.js";
import { runCool, type StepState, type CoolOptions, type CoolResult } from "./commands/cool.js";
import { runDoctor, type DoctorReport } from "./commands/doctor.js";
import { detectPm, detectNextVersion } from "./lib/detect-pm.js";
import os from "node:os";

const VERSION = "0.1.0";

export type AppMode = "cool" | "clean" | "purge" | "kill" | "doctor";

interface AppProps extends CoolOptions {
  mode: AppMode;
  cwd: string;
}

function buildCoolOpts(mode: AppMode, props: AppProps): CoolOptions {
  const base: CoolOptions = {
    dryRun: props.dryRun,
    full: props.full,
    webpack: props.webpack,
    memoryMb: props.memoryMb,
    cwd: props.cwd,
  };

  switch (mode) {
    case "cool":
      return { ...base, skipKill: false, skipInstall: false, skipBuild: false };
    case "clean":
      return { ...base, skipKill: true, skipInstall: true, skipBuild: true };
    case "purge":
      return { ...base, skipKill: true, skipInstall: true, skipBuild: true };
    case "kill":
      return { ...base, skipKill: false, skipInstall: true, skipBuild: true };
    default:
      return base;
  }
}

export function App(props: AppProps) {
  const { mode, cwd } = props;
  const { exit } = useApp();
  const pm = detectPm(cwd);
  const nextVersion = detectNextVersion(cwd);
  const platform = `${os.platform()} ${os.arch()}`;

  const [steps, setSteps] = useState<StepState[]>([]);
  const [result, setResult] = useState<CoolResult | null>(null);
  const [doctorReport, setDoctorReport] = useState<DoctorReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      try {
        if (mode === "doctor") {
          const report = await runDoctor(cwd);
          setDoctorReport(report);
          return;
        }

        const opts = buildCoolOpts(mode, props);
        const r = await runCool({
          ...opts,
          onStep: (s) => setSteps([...s]),
        });
        setResult(r);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
        exit();
      }
    }

    void run();
  }, []);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Banner version={VERSION} pm={pm} nextVersion={nextVersion} platform={platform} />

      {error && (
        <Box>
          <Text color="red" bold>
            Error: {error}
          </Text>
        </Box>
      )}

      {mode === "doctor" && !doctorReport && !error && (
        <Text color="cyan">Running diagnostics...</Text>
      )}

      {mode === "doctor" && doctorReport && (
        <DoctorView report={doctorReport} />
      )}

      {mode !== "doctor" && (
        <ProgressDashboard
          steps={steps}
          done={!loading && result !== null}
          totalReclaimedBytes={result?.totalReclaimedBytes}
          killedProcesses={result?.killedProcesses}
          elapsedMs={result?.elapsedMs}
        />
      )}
    </Box>
  );
}
