import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Build report: what `nextcool ci --report` measures after `next build`.
 *
 * Goal in CI is not cleanup but *visibility* — surface build time and the
 * size of what ships, and (with a --baseline) flag size regressions on a PR
 * before they merge. Written as JSON (machine, for the next run's baseline)
 * and as a markdown table to $GITHUB_STEP_SUMMARY (human, in the Actions UI).
 */

export const REPORT_VERSION = 1 as const;

export interface BuildReport {
  version: typeof REPORT_VERSION;
  generatedAt: string; // ISO timestamp
  buildMs: number; // wall-clock duration of `next build`
  dotNextBytes: number; // total .next output
  staticBytes: number; // .next/static — the client bundle that ships to users
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

/** Measure the build output in `cwd/.next` and pair it with the build time. */
export async function measureBuildReport(
  cwd: string,
  buildMs: number
): Promise<BuildReport> {
  const dotNext = join(cwd, ".next");
  const [dotNextBytes, staticBytes] = await Promise.all([
    dirBytes(dotNext),
    dirBytes(join(dotNext, "static")),
  ]);
  return {
    version: REPORT_VERSION,
    generatedAt: new Date().toISOString(),
    buildMs,
    dotNextBytes,
    staticBytes,
  };
}

export function writeReportJson(path: string, report: BuildReport): void {
  writeFileSync(path, JSON.stringify(report, null, 2), "utf8");
}

/** Read a previous report (a base-branch baseline). Returns null if absent/invalid. */
export function readReportJson(path: string): BuildReport | null {
  try {
    if (!existsSync(path)) return null;
    const r = JSON.parse(readFileSync(path, "utf8")) as BuildReport;
    if (r.version !== REPORT_VERSION) return null;
    return r;
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

/** Markdown delta cell, e.g. `+412 KB (+3.1%) ⚠️` or `—`. fmt matches the row's unit. */
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
    row("Client bundle (.next/static)", formatBytes, report.staticBytes, baseline?.staticBytes),
    row("Total output (.next)", formatBytes, report.dotNextBytes, baseline?.dotNextBytes),
    "",
  ];
  return lines.join("\n");
}

/** Append markdown to the GitHub Actions job summary, if running in Actions. */
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
 * Compares client bundle (.next/static) growth against failPct.
 */
export function evaluateGrowth(
  report: BuildReport,
  baseline: BuildReport | null,
  failPct: number
): { failed: boolean; message: string } {
  if (!baseline || failPct <= 0) return { failed: false, message: "" };
  const d = delta(report.staticBytes, baseline.staticBytes);
  if (d.bytes > 0 && d.pct >= failPct) {
    return {
      failed: true,
      message: `Client bundle grew ${formatBytes(d.bytes)} (+${d.pct.toFixed(1)}%), over the ${failPct}% limit.`,
    };
  }
  return { failed: false, message: "" };
}
