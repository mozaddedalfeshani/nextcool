import React, { useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { Banner } from "./ui/Banner.js";
import { MainMenu, type MenuChoice } from "./ui/MainMenu.js";
import { ManualSelector, type ManualSelection } from "./ui/ManualSelector.js";
import { ProgressDashboard } from "./ui/ProgressDashboard.js";
import { DoctorView } from "./ui/DoctorView.js";
import {
  runCool,
  type StepState,
  type CoolOptions,
  type CoolResult,
} from "./commands/cool.js";
import { runDoctor, type DoctorReport } from "./commands/doctor.js";
import { detectPm, detectNextVersion } from "./lib/detect-pm.js";
import os from "node:os";

const VERSION = "0.1.0";

export type AppMode =
  | "interactive"   // show main menu
  | "cool"
  | "clean"
  | "purge"
  | "kill"
  | "doctor";

type Screen =
  | "menu"
  | "manual-select"
  | "running"
  | "doctor-running"
  | "done"
  | "doctor-done";

interface AppProps extends CoolOptions {
  mode: AppMode;
  cwd: string;
}

function buildOptsFromMode(mode: AppMode, props: AppProps): CoolOptions {
  const base: CoolOptions = {
    dryRun: props.dryRun,
    full: props.full,
    webpack: props.webpack,
    memoryMb: props.memoryMb,
    cwd: props.cwd,
  };
  switch (mode) {
    case "cool":
    case "interactive":
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

  const [screen, setScreen] = useState<Screen>(() => {
    if (mode === "interactive") return "menu";
    if (mode === "doctor") return "doctor-running";
    return "running";
  });

  const [steps, setSteps] = useState<StepState[]>([]);
  const [result, setResult] = useState<CoolResult | null>(null);
  const [doctorReport, setDoctorReport] = useState<DoctorReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coolOpts, setCoolOpts] = useState<CoolOptions>(
    buildOptsFromMode(mode, props)
  );

  async function startCool(opts: CoolOptions) {
    setScreen("running");
    try {
      const r = await runCool({ ...opts, onStep: (s) => setSteps([...s]) });
      setResult(r);
      setScreen("done");
    } catch (e) {
      setError(String(e));
      setScreen("done");
    } finally {
      exit();
    }
  }

  async function startDoctor() {
    setScreen("doctor-running");
    try {
      const r = await runDoctor(cwd);
      setDoctorReport(r);
      setScreen("doctor-done");
    } catch (e) {
      setError(String(e));
    } finally {
      exit();
    }
  }

  // non-interactive modes: auto-start
  useEffect(() => {
    if (mode !== "interactive") {
      if (mode === "doctor") {
        void startDoctor();
      } else {
        void startCool(buildOptsFromMode(mode, props));
      }
    }
  }, []);

  function handleMenuChoice(choice: MenuChoice) {
    if (choice === "quit") {
      exit();
      return;
    }
    if (choice === "doctor") {
      void startDoctor();
      return;
    }
    if (choice === "auto") {
      const opts: CoolOptions = {
        ...coolOpts,
        skipKill: false,
        skipInstall: false,
        skipBuild: false,
      };
      setCoolOpts(opts);
      void startCool(opts);
      return;
    }
    if (choice === "manual") {
      setScreen("manual-select");
    }
  }

  function handleManualConfirm(sel: ManualSelection) {
    const opts: CoolOptions = {
      cwd,
      dryRun: props.dryRun,
      full: sel.full,
      webpack: sel.webpack,
      skipKill: !sel.kill,
      skipInstall: !sel.install,
      skipBuild: !sel.build,
    };
    setCoolOpts(opts);
    void startCool(opts);
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Banner version={VERSION} pm={pm} nextVersion={nextVersion} platform={platform} />

      {error && (
        <Text color="red" bold>
          Error: {error}
        </Text>
      )}

      {screen === "menu" && (
        <MainMenu onSelect={handleMenuChoice} />
      )}

      {screen === "manual-select" && (
        <ManualSelector
          onConfirm={handleManualConfirm}
          onBack={() => setScreen("menu")}
        />
      )}

      {(screen === "running" || screen === "done") && (
        <ProgressDashboard
          steps={steps}
          done={screen === "done" && result !== null}
          totalReclaimedBytes={result?.totalReclaimedBytes}
          killedProcesses={result?.killedProcesses}
          elapsedMs={result?.elapsedMs}
        />
      )}

      {screen === "doctor-running" && !doctorReport && !error && (
        <Text color="cyan">Running diagnostics...</Text>
      )}

      {(screen === "doctor-done") && doctorReport && (
        <DoctorView report={doctorReport} />
      )}
    </Box>
  );
}
