import { existsSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";
import { runCmd } from "../lib/exec.js";
import { resolveBin } from "../lib/cmd.js";
import { logBus, type LogLine } from "../lib/log-bus.js";
import { detectPm, type PackageManager } from "../lib/detect-pm.js";
import { detectFramework } from "../lib/detect-framework.js";
import { runReinstall } from "./reinstall.js";
import { runLint } from "./lint.js";
import { runFormat } from "./format.js";
import { runRebuild } from "./rebuild.js";
import {
  measureBuildReport,
  writeReportJson,
  readReportJson,
  renderStepSummary,
  appendStepSummary,
  evaluateGrowth,
  formatBytes,
  formatMs,
  type BuildReport,
} from "../lib/build-report.js";

/**
 * `nextcool ci` — the only mode that makes sense on a CI runner.
 *
 * Unlike the interactive/cool paths this is plain stdout (no Ink); the TUI
 * banner renders as garbage in Actions logs. It is a quality gate
 * (install → typecheck → lint → format:check → build) with real exit codes,
 * plus an optional build report (--report) and base-branch diff (--baseline).
 */

export interface CiOptions {
  cwd?: string;
  pm?: PackageManager;
  skipInstall?: boolean;
  webpack?: boolean;
  memoryMb?: number;
  report?: boolean;
  baseline?: string; // path to a previous report JSON to diff against
  reportOut?: string; // where to write this run's report JSON
  failOnGrowth?: number; // % client-bundle growth that fails the run (0 = off)
}

export interface CiResult {
  success: boolean;
  exitCode: number;
  report?: BuildReport;
}

type StepOutcome = { ok: boolean; skipped?: boolean; detail?: string };

const DEFAULT_REPORT_OUT = "nextcool-report.json";
const DEFAULT_WARN_PCT = 5;

export async function runCi(opts: CiOptions = {}): Promise<CiResult> {
  const cwd = opts.cwd ?? process.cwd();
  const pm = opts.pm ?? detectPm(cwd);
  const fw = detectFramework(cwd);

  // Stream every subprocess line to stdout, indented, so CI logs show real output.
  const onLine = (l: LogLine) => process.stdout.write(pc.dim(`    ${l.text}\n`));
  logBus.on("line", onLine);

  let report: BuildReport | undefined;
  let buildMs = 0;
  let failed = false;

  try {
    const step = async (label: string, fn: () => Promise<StepOutcome>): Promise<boolean> => {
      process.stdout.write(pc.cyan(`▶ ${label}\n`));
      const start = Date.now();
      const out = await fn();
      const took = formatMs(Date.now() - start);
      if (out.skipped) {
        process.stdout.write(pc.yellow(`↓ ${label} — skipped${out.detail ? ` (${out.detail})` : ""}\n\n`));
        return true;
      }
      if (out.ok) {
        process.stdout.write(pc.green(`✓ ${label} (${took})${out.detail ? ` — ${out.detail}` : ""}\n\n`));
        return true;
      }
      process.stdout.write(pc.red(`✗ ${label} (${took})${out.detail ? ` — ${out.detail}` : ""}\n\n`));
      return false;
    };

    // 1. install
    if (!opts.skipInstall) {
      if (!(await step(`Install dependencies (${pm})`, async () => {
        const r = await runReinstall(pm, { cwd });
        return { ok: r.success, detail: r.success ? undefined : `exit ${r.exitCode}` };
      }))) return finish(false, 1);
    }

    // 2. typecheck (tsc --noEmit) — skipped when no tsconfig
    if (!(await step("Typecheck (tsc)", () => runTypecheck(cwd)))) return finish(false, 1);

    // 3. lint
    if (!(await step("Lint (eslint)", async () => {
      const r = await runLint({ cwd });
      if (r.skipped) return { ok: true, skipped: true, detail: "eslint not found" };
      return { ok: r.success, detail: r.success ? undefined : `exit ${r.exitCode}` };
    }))) return finish(false, 1);

    // 4. format check (never mutates the tree in CI)
    if (!(await step("Format check (prettier)", async () => {
      const r = await runFormat({ cwd, checkOnly: true });
      if (r.skipped) return { ok: true, skipped: true, detail: "prettier not found" };
      return { ok: r.success, detail: r.success ? undefined : `exit ${r.exitCode}` };
    }))) return finish(false, 1);

    // 5. build (+ optional report)
    if (!(await step(`Build (${fw.label})`, async () => {
      const r = await runRebuild({ cwd, webpack: opts.webpack, memoryMb: opts.memoryMb });
      buildMs = r.durationMs;
      return { ok: r.success, detail: r.success ? formatMs(r.durationMs) : `exit ${r.exitCode}` };
    }))) return finish(false, 1);

    if (opts.report) {
      report = await emitReport(cwd, buildMs, opts);
      const baseline = opts.baseline ? readReportJson(opts.baseline) : null;
      const gate = evaluateGrowth(report, baseline, opts.failOnGrowth ?? 0);
      if (gate.failed) {
        process.stdout.write(pc.red(`✗ Bundle gate — ${gate.message}\n`));
        failed = true;
      }
    }
  } finally {
    logBus.off("line", onLine);
  }

  return finish(!failed, failed ? 1 : 0, report);

  function finish(success: boolean, exitCode: number, r?: BuildReport): CiResult {
    return { success, exitCode, report: r };
  }
}

async function runTypecheck(cwd: string): Promise<StepOutcome> {
  if (!existsSync(join(cwd, "tsconfig.json"))) {
    return { ok: true, skipped: true, detail: "no tsconfig.json" };
  }
  const r = await runCmd("typecheck", resolveBin("npx"), ["tsc", "--noEmit"], { cwd });
  return { ok: r.exitCode === 0, detail: r.exitCode === 0 ? undefined : `exit ${r.exitCode}` };
}

async function emitReport(
  cwd: string,
  buildMs: number,
  opts: CiOptions
): Promise<BuildReport> {
  const report = await measureBuildReport(cwd, buildMs);
  const baseline = opts.baseline ? readReportJson(opts.baseline) : null;

  const out = opts.reportOut ?? DEFAULT_REPORT_OUT;
  writeReportJson(join(cwd, out), report);

  const md = renderStepSummary(report, baseline, DEFAULT_WARN_PCT);
  const wrote = appendStepSummary(md);

  // Always echo a compact summary to the log, even outside Actions.
  process.stdout.write(
    pc.bold("\n🧊 build report\n") +
      `   build time:    ${formatMs(report.buildMs)}\n` +
      (report.clientBytes !== null && report.clientDir
        ? `   client bundle: ${formatBytes(report.clientBytes)} (${report.clientDir})\n`
        : "") +
      `   total output:  ${formatBytes(report.outputBytes)} (${report.outputDir})\n` +
      (wrote ? pc.dim("   (written to job summary)\n") : "") +
      pc.dim(`   (report json:  ${out})\n\n`)
  );

  return report;
}
