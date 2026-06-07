import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CleanTarget } from "../config/targets.js";
import { BASE_CLEAN_TARGETS } from "../config/targets.js";

export type ReactFramework =
  | "next"
  | "vite"
  | "remix"
  | "expo"
  | "react-native"
  | "electron"
  | "gatsby"
  | "astro"
  | "cra"
  | "react"
  | "unknown";

export interface PackageJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface FrameworkInfo {
  framework: ReactFramework;
  label: string;
  version: string | null;
  hasDevServer: boolean;
  hasProdServer: boolean;
  supportsWebpackFlag: boolean;
  supportsTurbopack: boolean;
}

export interface ResolvedCommand {
  cmd: string;
  args: string[];
  label: string;
  viaScript?: boolean;
}

const FRAMEWORK_LABELS: Record<ReactFramework, string> = {
  next: "Next.js",
  vite: "Vite",
  remix: "Remix",
  expo: "Expo",
  "react-native": "React Native",
  electron: "Electron",
  gatsby: "Gatsby",
  astro: "Astro",
  cra: "Create React App",
  react: "React",
  unknown: "Unknown",
};

const FRAMEWORK_DEPS: { dep: string; framework: ReactFramework }[] = [
  { dep: "next", framework: "next" },
  { dep: "expo", framework: "expo" },
  { dep: "react-native", framework: "react-native" },
  { dep: "@remix-run/node", framework: "remix" },
  { dep: "remix", framework: "remix" },
  { dep: "gatsby", framework: "gatsby" },
  { dep: "astro", framework: "astro" },
  { dep: "vite", framework: "vite" },
  { dep: "react-scripts", framework: "cra" },
  { dep: "electron", framework: "electron" },
];

const FRAMEWORK_CLEAN_TARGETS: Record<ReactFramework, CleanTarget[]> = {
  next: [{ rel: ".next", label: ".next build cache" }],
  vite: [
    { rel: "dist", label: "dist output" },
    { rel: ".vite", label: ".vite cache" },
  ],
  remix: [
    { rel: "build", label: "Remix build output" },
    { rel: ".cache", label: ".cache" },
  ],
  expo: [{ rel: ".expo", label: ".expo cache" }],
  "react-native": [],
  electron: [
    { rel: "dist", label: "dist output" },
    { rel: "out", label: "out output" },
    { rel: "release", label: "release output" },
  ],
  gatsby: [{ rel: ".cache", label: "Gatsby .cache" }],
  astro: [
    { rel: "dist", label: "dist output" },
    { rel: ".astro", label: ".astro cache" },
  ],
  cra: [{ rel: "build", label: "build output" }],
  react: [{ rel: "dist", label: "dist output" }],
  unknown: [{ rel: "dist", label: "dist output" }],
};

export function readPackageJson(cwd = process.cwd()): PackageJson | null {
  try {
    return JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")) as PackageJson;
  } catch {
    return null;
  }
}

function depVersion(pkg: PackageJson, name: string): string | null {
  return pkg.dependencies?.[name] ?? pkg.devDependencies?.[name] ?? null;
}

function hasReact(pkg: PackageJson): boolean {
  return depVersion(pkg, "react") !== null;
}

export function detectFramework(cwd = process.cwd()): FrameworkInfo {
  const pkg = readPackageJson(cwd);
  if (!pkg) {
    return {
      framework: "unknown",
      label: FRAMEWORK_LABELS.unknown,
      version: null,
      hasDevServer: false,
      hasProdServer: false,
      supportsWebpackFlag: false,
      supportsTurbopack: false,
    };
  }

  for (const { dep, framework } of FRAMEWORK_DEPS) {
    const version = depVersion(pkg, dep);
    if (version !== null) {
      return buildFrameworkInfo(framework, version, pkg);
    }
  }

  if (hasReact(pkg)) {
    return buildFrameworkInfo("react", depVersion(pkg, "react"), pkg);
  }

  return {
    framework: "unknown",
    label: FRAMEWORK_LABELS.unknown,
    version: null,
    hasDevServer: Boolean(pkg.scripts?.dev || pkg.scripts?.start),
    hasProdServer: Boolean(pkg.scripts?.start || pkg.scripts?.preview),
    supportsWebpackFlag: false,
    supportsTurbopack: false,
  };
}

function buildFrameworkInfo(
  framework: ReactFramework,
  version: string | null,
  pkg: PackageJson
): FrameworkInfo {
  const scripts = pkg.scripts ?? {};
  const hasDevServer =
    framework === "react-native"
      ? Boolean(scripts.start || scripts["react-native"])
      : framework === "electron"
        ? Boolean(scripts.dev || scripts.electron)
        : Boolean(scripts.dev || scripts.start);

  const hasProdServer =
    framework === "next" ||
    framework === "vite" ||
    framework === "remix" ||
    framework === "expo" ||
    Boolean(scripts.start || scripts.preview);

  return {
    framework,
    label: FRAMEWORK_LABELS[framework],
    version,
    hasDevServer,
    hasProdServer,
    supportsWebpackFlag: framework === "next",
    supportsTurbopack: framework === "next",
  };
}

export function isReactProject(cwd = process.cwd()): boolean {
  const pkg = readPackageJson(cwd);
  if (!pkg) return false;
  if (hasReact(pkg)) return true;
  return FRAMEWORK_DEPS.some(({ dep }) => depVersion(pkg, dep) !== null);
}

/** @deprecated Use isReactProject — kept for internal Next.js checks */
export function isNextProject(cwd = process.cwd()): boolean {
  const pkg = readPackageJson(cwd);
  return pkg ? depVersion(pkg, "next") !== null : false;
}

export function detectNextVersion(cwd = process.cwd()): string | null {
  const pkg = readPackageJson(cwd);
  return pkg ? depVersion(pkg, "next") : null;
}

export function getCleanTargets(cwd = process.cwd()): CleanTarget[] {
  const { framework } = detectFramework(cwd);
  const specific = FRAMEWORK_CLEAN_TARGETS[framework];
  const seen = new Set(BASE_CLEAN_TARGETS.map((t) => t.rel));
  const merged = [...BASE_CLEAN_TARGETS];
  for (const t of specific) {
    if (!seen.has(t.rel)) {
      seen.add(t.rel);
      merged.push(t);
    }
  }
  return merged;
}

function scriptCommand(cwd: string, scriptName: string): ResolvedCommand | null {
  const pkg = readPackageJson(cwd);
  const script = pkg?.scripts?.[scriptName];
  if (!script) return null;
  return {
    cmd: process.platform === "win32" ? "cmd.exe" : "sh",
    args: process.platform === "win32" ? ["/c", script] : ["-c", script],
    label: `npm run ${scriptName}`,
    viaScript: true,
  };
}

export function resolveBuildCommand(
  cwd: string,
  opts: { webpack?: boolean } = {}
): ResolvedCommand {
  const info = detectFramework(cwd);
  const fromScript = scriptCommand(cwd, "build");
  if (fromScript) return fromScript;

  switch (info.framework) {
    case "next": {
      const args = ["next", "build"];
      if (opts.webpack) args.push("--no-turbo");
      return { cmd: "npx", args, label: `next build${opts.webpack ? " (webpack)" : ""}` };
    }
    case "vite":
      return { cmd: "npx", args: ["vite", "build"], label: "vite build" };
    case "remix":
      return { cmd: "npx", args: ["remix", "build"], label: "remix build" };
    case "expo":
      return { cmd: "npx", args: ["expo", "export"], label: "expo export" };
    case "gatsby":
      return { cmd: "npx", args: ["gatsby", "build"], label: "gatsby build" };
    case "astro":
      return { cmd: "npx", args: ["astro", "build"], label: "astro build" };
    case "cra":
      return { cmd: "npx", args: ["react-scripts", "build"], label: "react-scripts build" };
    case "electron":
      return { cmd: "npx", args: ["electron-builder"], label: "electron-builder" };
    case "react-native":
      return { cmd: "npx", args: ["react-native", "bundle"], label: "react-native bundle" };
    default:
      return { cmd: "npx", args: ["vite", "build"], label: "vite build" };
  }
}

export function resolveDevCommand(cwd: string): ResolvedCommand | null {
  const fromScript = scriptCommand(cwd, "dev");
  if (fromScript) return fromScript;

  const info = detectFramework(cwd);
  switch (info.framework) {
    case "next":
      return { cmd: "npx", args: ["next", "dev"], label: "next dev" };
    case "vite":
      return { cmd: "npx", args: ["vite"], label: "vite dev" };
    case "remix":
      return { cmd: "npx", args: ["remix", "dev"], label: "remix dev" };
    case "expo":
      return { cmd: "npx", args: ["expo", "start"], label: "expo start" };
    case "react-native":
      return { cmd: "npx", args: ["react-native", "start"], label: "react-native start" };
    case "gatsby":
      return { cmd: "npx", args: ["gatsby", "develop"], label: "gatsby develop" };
    case "astro":
      return { cmd: "npx", args: ["astro", "dev"], label: "astro dev" };
    case "cra":
      return { cmd: "npx", args: ["react-scripts", "start"], label: "react-scripts start" };
    case "electron": {
      const startScript = scriptCommand(cwd, "start");
      return startScript ?? { cmd: "npx", args: ["electron", "."], label: "electron ." };
    }
    default:
      return scriptCommand(cwd, "start");
  }
}

export function resolveProdCommand(cwd: string): ResolvedCommand | null {
  const fromScript = scriptCommand(cwd, "start");
  if (fromScript) return fromScript;

  const info = detectFramework(cwd);
  switch (info.framework) {
    case "next":
      return { cmd: "npx", args: ["next", "start"], label: "next start" };
    case "vite":
      return { cmd: "npx", args: ["vite", "preview"], label: "vite preview" };
    case "remix":
      return { cmd: "npx", args: ["remix-serve", "build"], label: "remix-serve" };
    case "expo":
      return { cmd: "npx", args: ["expo", "start", "--no-dev"], label: "expo start --no-dev" };
    case "gatsby":
      return { cmd: "npx", args: ["gatsby", "serve"], label: "gatsby serve" };
    case "astro":
      return { cmd: "npx", args: ["astro", "preview"], label: "astro preview" };
    default:
      return scriptCommand(cwd, "preview");
  }
}

export interface BuildOutputPaths {
  outputDir: string;
  clientBundleDir: string | null;
  outputLabel: string;
  clientLabel: string | null;
}

export function getBuildOutputPaths(cwd = process.cwd()): BuildOutputPaths {
  const { framework } = detectFramework(cwd);
  switch (framework) {
    case "next":
      return {
        outputDir: ".next",
        clientBundleDir: ".next/static",
        outputLabel: "Total output (.next)",
        clientLabel: "Client bundle (.next/static)",
      };
    case "vite":
    case "remix":
    case "cra":
    case "astro":
    case "electron":
    case "react":
      return {
        outputDir: "dist",
        clientBundleDir: "dist/assets",
        outputLabel: "Total output (dist)",
        clientLabel: "Assets (dist/assets)",
      };
    case "gatsby":
      return {
        outputDir: "public",
        clientBundleDir: "public",
        outputLabel: "Total output (public)",
        clientLabel: "Static output (public)",
      };
    case "expo":
      return {
        outputDir: "dist",
        clientBundleDir: null,
        outputLabel: "Total output (dist)",
        clientLabel: null,
      };
    default:
      return {
        outputDir: "dist",
        clientBundleDir: null,
        outputLabel: "Total output (dist)",
        clientLabel: null,
      };
  }
}

export function detectTurbopack(cwd: string): { hasTurbopack: boolean; hasWebpackFallback: boolean } {
  const info = detectFramework(cwd);
  if (info.framework !== "next") {
    return { hasTurbopack: false, hasWebpackFallback: false };
  }

  const configFiles = [
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "next.config.cjs",
  ];

  for (const f of configFiles) {
    const p = join(cwd, f);
    if (!existsSync(p)) continue;
    try {
      const src = readFileSync(p, "utf8");
      return {
        hasTurbopack:
          src.includes("turbopack") || src.includes("turbo:") || src.includes("experimental"),
        hasWebpackFallback: src.includes("--webpack") || src.includes("webpack"),
      };
    } catch {
      // ignore
    }
  }

  try {
    const pkg = readPackageJson(cwd);
    const scripts = Object.values(pkg?.scripts ?? {}).join(" ");
    return {
      hasTurbopack: scripts.includes("--turbo") || scripts.includes("turbopack"),
      hasWebpackFallback: scripts.includes("--webpack"),
    };
  } catch {
    return { hasTurbopack: false, hasWebpackFallback: false };
  }
}
