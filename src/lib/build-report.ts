import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { getBuildOutputPaths } from "./detect-framework.js";

/**
 * Build report: what `nextcool ci --report` measures after a project build.
 *
 * Goal in CI is visibility — surface build time and output size, and (with
 * --baseline) flag size regressions on a PR before they merge.
 */

export const REPORT_VERSION = 2 as const;

export interface BuildReport {
  version: typeof REPORT_VERSION;
  generatedAt: string;
  buildMs: number;
  outputBytes: number;
  clientBytes: number | null;
  outputDir: string;
  clientDir: string | null;
}

async function dirBytes(dir: string): Promise<number> {
  if (!existsSync(dir)) return 0;
  try {
    const { default: getFolderSize } = await import("get-folder-size");
    return await getFolderSize.loose(dir);
  } catch {
    return 0;
  }
}

/** Measure build output and pair it with the build time. */
export async function measureBuildReport(
  cwd: string,
  buildMs: number
): Promise<BuildReport> {
  const paths = getBuildOutputPaths(cwd);
  const outputPath = join(cwd, paths.outputDir);
  const clientPath = paths.clientBundleDir ? join(cwd, paths.clientBundleDir) : null;

  const [outputBytes, clientBytes] = await Promise.all([
    dirBytes(outputPath),
    clientPath ? dirBytes(clientPath) : Promise.resolve(null),
  ]);

  return {
    version: REPORT_VERSION,
    generatedAt: new Date().toISOString(),
    buildMs,
    outputBytes,
    clientBytes,
    outputDir: paths.outputDir,
    clientDir: paths.clientBundleDir,
  };
}

export function writeReportJson(path: string, report: BuildReport): void {
  writeFileSync(path, JSON.stringify(report, null, 2), "utf8");
}

/** Read a previous report (base-branch baseline). Returns null if absent/invalid. */
export function readReportJson(path: string): BuildReport | null {
  try {
    if (!existsSync(path)) return null;
    const r = JSON.parse(readFileSync(path, "utf8")) as BuildReport & {
      dotNextBytes?: number;
      staticBytes?: number;
      version?: number;
    };

    if (r.version === REPORT_VERSION) return r;

    // Migrate v1 (Next.js-only) reports
    if (r.version === 1 || (r.dotNextBytes !== undefined && r.staticBytes !== undefined)) {
      return {
        version: REPORT_VERSION,
        generatedAt: r.generatedAt,
        buildMs: r.buildMs,
        outputBytes: r.dotNextBytes ?? r.outputBytes ?? 0,
        clientBytes: r.staticBytes ?? r.clientBytes ?? null,
        outputDir: ".next",
        clientDir: ".next/static",
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const n = bytes / Math.pow(1024, i);
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

interface Delta {
  bytes: number;
  pct: number;
}

function delta(current: number, base: number): Delta {
  const d = current - base;
  const pct = base > 0 ? (d / base) * 100 : 0;
  return { bytes: d, pct };
}

function deltaCell(
  current: number,
  base: number | undefined,
  warnPct: number,
  fmt: (n: number) => string
): string {
  if (base === undefined) return "—";
  const d = delta(current, base);
  if (d.bytes === 0) return "no change";
  const sign = d.bytes > 0 ? "+" : "−";
  const warn = d.bytes > 0 && d.pct >= warnPct ? " ⚠️" : "";
  return `${sign}${fmt(Math.abs(d.bytes))} (${sign}${Math.abs(d.pct).toFixed(1)}%)${warn}`;
}

/** Render a markdown table comparing the current report to an optional baseline. */
export function renderStepSummary(
  report: BuildReport,
  baseline: BuildReport | null,
  warnPct: number
): string {
  const paths = {
    outputLabel: `Total output (${report.outputDir})`,
    clientLabel: report.clientDir ? `Client bundle (${report.clientDir})` : null,
  };

  const head = baseline
    ? "| Metric | Current | Base | Δ |\n| --- | --- | --- | --- |"
    : "| Metric | Current |\n| --- | --- |";

  const row = (label: string, fmt: (n: number) => string, cur: number, base?: number) =>
    baseline
      ? `| ${label} | ${fmt(cur)} | ${base !== undefined ? fmt(base) : "—"} | ${deltaCell(cur, base, warnPct, fmt)} |`
      : `| ${label} | ${fmt(cur)} |`;

  const lines = [
    "### 🧊 nextcool build report",
    "",
    head,
    row("Build time", formatMs, report.buildMs, baseline?.buildMs),
  ];

  if (paths.clientLabel && report.clientBytes !== null) {
    lines.push(
      row(paths.clientLabel, formatBytes, report.clientBytes, baseline?.clientBytes ?? undefined)
    );
  }

  lines.push(
    row(paths.outputLabel, formatBytes, report.outputBytes, baseline?.outputBytes),
    ""
  );

  return lines.join("\n");
}

export function appendStepSummary(markdown: string): boolean {
  const path = process.env["GITHUB_STEP_SUMMARY"];
  if (!path) return false;
  try {
    appendFileSync(path, markdown + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Decide whether bundle growth should fail the run.
 * Compares client bundle growth when available, else total output growth.
 */
export function evaluateGrowth(
  report: BuildReport,
  baseline: BuildReport | null,
  failPct: number
): { failed: boolean; message: string } {
  if (!baseline || failPct <= 0) return { failed: false, message: "" };

  const current = report.clientBytes ?? report.outputBytes;
  const base = baseline.clientBytes ?? baseline.outputBytes;
  const label = report.clientDir ?? report.outputDir;

  const d = delta(current, base);
  if (d.bytes > 0 && d.pct >= failPct) {
    return {
      failed: true,
      message: `${label} grew ${formatBytes(d.bytes)} (+${d.pct.toFixed(1)}%), over the ${failPct}% limit.`,
    };
  }
  return { failed: false, message: "" };
}
