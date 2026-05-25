import React, { useEffect, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { Banner } from "./ui/Banner.js";
import { StatsBar } from "./ui/StatsBar.js";
import { MainMenu, type MenuChoice } from "./ui/MainMenu.js";
import { ManualSelector, type ManualSelection } from "./ui/ManualSelector.js";
import { ProgressDashboard } from "./ui/ProgressDashboard.js";
import { DoctorView } from "./ui/DoctorView.js";
import { CoreSelector } from "./ui/CoreSelector.js";
import { ServerView } from "./ui/ServerView.js";
import { PmSelector } from "./ui/PmSelector.js";
import {
  runCool,
  type StepState,
  type CoolOptions,
  type CoolResult,
} from "./commands/cool.js";
import { runDoctor, type DoctorReport } from "./commands/doctor.js";
import { runPrep, type PrepResult } from "./commands/prep.js";
import { PrepErrors } from "./ui/PrepErrors.js";
import { PrepDashboard } from "./ui/PrepDashboard.js";
import { spawnServer, type ServerHandle, type ServerMode } from "./commands/run-server.js";
import { detectPm, detectAllPms, detectNextVersion, isNextProject, type PackageManager, type DetectedPm } from "./lib/detect-pm.js";
import os from "node:os";

const VERSION = "2.2.15";

export type AppMode =
  | "interactive"   // show main menu
  | "cool"
  | "fullclean"
  | "clean"
  | "purge"
  | "kill"
  | "doctor"
  | "prep";

type Screen =
  | "no-project"
  | "menu"
  | "manual-select"
  | "pm-select"
  | "running"
  | "doctor-running"
  | "done"
  | "doctor-done"
  | "run-select"
  | "run-server";

interface AppProps extends CoolOptions {
  mode: AppMode;
  cwd: string;
  serverAfter?: ServerMode;
}

function buildOptsFromMode(mode: AppMode, props: AppProps): CoolOptions {
  const base: CoolOptions = {
    dryRun: props.dryRun,
    full: props.full,
    webpack: props.webpack,
    memoryMb: props.memoryMb,
    cwd: props.cwd,
  };
  // --prod boots `next start`, which requires a fresh build even in clean/purge modes.
  const forceBuild = props.serverAfter === "start";
  switch (mode) {
    case "cool":
    case "interactive":
      return { ...base, skipKill: false, skipInstall: false, skipBuild: false };
    case "fullclean":
      return { ...base, full: true, lint: true, format: true, skipKill: false, skipInstall: false, skipBuild: false };
    case "clean":
      return { ...base, skipKill: true, skipInstall: true, skipBuild: !forceBuild };
    case "purge":
      return { ...base, skipKill: true, skipInstall: true, skipBuild: !forceBuild };
    case "kill":
      return { ...base, skipKill: false, skipInstall: true, skipBuild: !forceBuild };
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

  const needsNextProject = mode !== "doctor" && mode !== "kill" && mode !== "purge";
  const noProject = needsNextProject && !isNextProject(cwd);

  const [screen, setScreen] = useState<Screen>(() => {
    if (noProject && mode === "interactive") return "no-project";
    if (mode === "interactive") return "menu";
    if (mode === "doctor") return "doctor-running";
    return "running";
  });

  const [steps, setSteps] = useState<StepState[]>([]);
  const [result, setResult] = useState<CoolResult | null>(null);
  const [doctorReport, setDoctorReport] = useState<DoctorReport | null>(null);
  const [prepResult, setPrepResult] = useState<PrepResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coolOpts, setCoolOpts] = useState<CoolOptions>(
    buildOptsFromMode(mode, props)
  );
  const [pendingOpts, setPendingOpts] = useState<CoolOptions | null>(null);
  const [detectedPms, setDetectedPms] = useState<DetectedPm[]>([]);
  const [serverHandle, setServerHandle] = useState<ServerHandle | null>(null);
  const [serverCores, setServerCores] = useState<number>(1);
  const [serverMode, setServerMode] = useState<ServerMode>("dev");
  const totalCores = os.cpus().length;

  async function startCool(opts: CoolOptions) {
    setScreen("running");
    try {
      const r = await runCool({ ...opts, onStep: (s) => setSteps([...s]) });
      setResult(r);
      setScreen("done");
      // Boot a server after a successful pipeline when --dev/--prod was passed.
      if (props.serverAfter && r.success) {
        const cores = Math.max(1, Math.floor(totalCores / 2));
        handleStartServer(cores, props.serverAfter);
        return; // keep process alive; server screen owns lifecycle
      }
      if (mode !== "interactive") exit();
    } catch (e) {
      setError(String(e));
      setScreen("done");
      if (mode !== "interactive") exit();
    }
  }

  async function startPrep() {
    setScreen("running");
    try {
      const r = await runPrep({
        cwd,
        dryRun: props.dryRun,
        webpack: props.webpack,
        memoryMb: props.memoryMb,
        onStep: (s) => setSteps([...s]),
      });
      setPrepResult(r);
      setScreen("done");
      if (mode !== "interactive") exit();
    } catch (e) {
      setError(String(e));
      setScreen("done");
      if (mode !== "interactive") exit();
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
      setScreen("doctor-done");
    } finally {
      if (mode !== "interactive") exit();
    }
  }

  const isResultScreen = screen === "done" || screen === "doctor-done";
  useInput((_input, key) => {
    if (mode !== "interactive") return;
    if (screen === "done") {
      setScreen("menu");
      setSteps([]);
      setResult(null);
      setPrepResult(null);
      setError(null);
    } else if (screen === "doctor-done" && key.escape) {
      setScreen("menu");
      setDoctorReport(null);
      setError(null);
    }
  }, { isActive: mode === "interactive" && isResultScreen });

  // non-interactive modes: auto-start
  useEffect(() => {
    if (screen === "no-project") {
      // give Ink one frame to render the error, then exit
      setTimeout(() => exit(), 100);
      return;
    }
    if (mode !== "interactive") {
      if (mode === "doctor") {
        void startDoctor();
      } else if (mode === "prep") {
        void startPrep();
      } else {
        void startCool(buildOptsFromMode(mode, props));
      }
    }
  }, []);

  function maybePickPm(opts: CoolOptions) {
    const all = detectAllPms(cwd);
    if (all.length > 1) {
      setDetectedPms(all);
      setPendingOpts(opts);
      setScreen("pm-select");
    } else {
      void startCool(opts);
    }
  }

  function handleMenuChoice(choice: MenuChoice) {
    if (choice === "quit") {
      exit();
      return;
    }
    if (choice === "doctor") {
      void startDoctor();
      return;
    }
    if (choice === "run-server") {
      setScreen("run-select");
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
      maybePickPm(opts);
      return;
    }
    if (choice === "manual") {
      setScreen("manual-select");
    }
  }

  function handleStartServer(cores: number, sMode: ServerMode) {
    const handle = spawnServer({ cores, mode: sMode, cwd, stepId: "server" });
    setServerHandle(handle);
    setServerCores(cores);
    setServerMode(sMode);
    setScreen("run-server");
  }

  function handleServerStop() {
    setServerHandle(null);
    setScreen("menu");
  }

  // Cleanup server on unmount (Ctrl+C path)
  useEffect(() => {
    return () => {
      if (serverHandle) void serverHandle.stop();
    };
  }, [serverHandle]);

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
    maybePickPm(opts);
  }

  function handlePmSelect(selectedPm: PackageManager) {
    const opts = { ...(pendingOpts ?? coolOpts), pm: selectedPm };
    setCoolOpts(opts);
    void startCool(opts);
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Banner version={VERSION} pm={pm} nextVersion={nextVersion} platform={platform} />

      <StatsBar />

      {error && (
        <Text color="red" bold>
          Error: {error}
        </Text>
      )}

      {screen === "no-project" && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="red" bold>✗ No Next.js project found in:</Text>
          <Text color="yellow">  {cwd}</Text>
          <Text dimColor>  Make sure package.json has a "next" dependency.</Text>
          <Text> </Text>
          <Text dimColor>  cd into your Next.js project, then run:</Text>
          <Text color="cyan">  nextcool</Text>
        </Box>
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

      {screen === "pm-select" && detectedPms.length > 1 && (
        <PmSelector
          detected={detectedPms}
          onSelect={handlePmSelect}
          onBack={() => setScreen("menu")}
        />
      )}

      {mode === "prep" && (screen === "running" || screen === "done") && (
        <Box marginTop={1}>
          <Text backgroundColor="yellow" color="black" bold> BETA </Text>
          <Text dimColor> prep is in testing — safe to use, please report issues</Text>
        </Box>
      )}

      {(screen === "running" || screen === "done") && mode === "prep" && (
        <PrepDashboard
          steps={steps}
          done={screen === "done" && prepResult !== null}
          elapsedMs={prepResult?.elapsedMs}
        />
      )}

      {(screen === "running" || screen === "done") && mode !== "prep" && (
        <ProgressDashboard
          steps={steps}
          done={screen === "done" && result !== null}
          totalReclaimedBytes={result?.totalReclaimedBytes}
          killedProcesses={result?.killedProcesses}
          elapsedMs={result?.elapsedMs}
        />
      )}

      {screen === "done" && prepResult && (
        <PrepErrors failed={prepResult.failed} />
      )}

      {screen === "done" && mode === "interactive" && (
        <Text dimColor>  Press any key to return to menu…</Text>
      )}

      {screen === "doctor-running" && !doctorReport && !error && (
        <Text color="cyan">Running diagnostics...</Text>
      )}

      {screen === "doctor-done" && doctorReport && (
        <DoctorView report={doctorReport} />
      )}

      {screen === "doctor-done" && mode === "interactive" && (
        <Text dimColor>  Press ESC to return to menu…</Text>
      )}

      {screen === "run-select" && (
        <CoreSelector
          totalCores={totalCores}
          onStart={handleStartServer}
          onBack={() => setScreen("menu")}
        />
      )}

      {screen === "run-server" && serverHandle && (
        <ServerView
          handle={serverHandle}
          cores={serverCores}
          totalCores={totalCores}
          mode={serverMode}
          onStop={handleServerStop}
        />
      )}
    </Box>
  );
}
