# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install       # install deps
pnpm dev           # watch mode (tsup --watch)
pnpm build         # production build → dist/
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint src
pnpm test          # jest (--experimental-vm-modules)
```

No test files exist yet — `pnpm test` will pass vacuously.

## Architecture

**nextcool** is a CLI tool (Node ≥18.18, ESM-only) that kills zombie node processes, clears Next.js caches, reinstalls deps, and rebuilds — with an optional CPU-limited dev/prod server.

### Entry points

- `bin/nextcool.js` → `dist/cli.js` (built from `src/cli.tsx`)
- `src/cli.tsx` — Commander program; parses flags, calls `render(<App>)` via Ink
- `src/app.tsx` — Root Ink component; owns all screen state (`Screen` union type) and orchestrates commands

### Two execution paths

1. **Interactive (TTY)** — `App` renders a menu (`MainMenu`), lets user pick Auto/Manual/Run Server/Doctor, then transitions screens
2. **Non-interactive (CI / explicit subcommand)** — `App` auto-starts the relevant command on mount via `useEffect`

### Command layer (`src/commands/`)

Each command is a plain async function returning a typed result:

| File | Function | Purpose |
|------|----------|---------|
| `cool.ts` | `runCool` | Orchestrates all 5 steps; accepts `skipKill/skipInstall/skipBuild` flags |
| `kill.ts` | `runKill` | Kills user-owned `node`/`next` processes via `ps-list` + `fkill` |
| `clean.ts` | `runClean` | Removes paths in `PROJECT_TARGETS` / `FULL_TARGETS` |
| `purge-cache.ts` | `runPurgeCache` | Runs PM-specific cache clean commands |
| `reinstall.ts` | `runReinstall` | Runs PM install |
| `rebuild.ts` | `runRebuild` | Runs `next build` (optionally `--no-turbo`, memory cap) |
| `doctor.ts` | `runDoctor` | Reports RAM, disk, zombie count, Turbopack signals |
| `run-server.ts` | `spawnServer` | Spawns `next dev/start` with CPU affinity (platform-specific) |

### Lib layer (`src/lib/`)

- `detect-pm.ts` — detects package manager from lockfiles; `detectAllPms` returns all found (triggers `PmSelector` when >1)
- `log-bus.ts` — singleton `EventEmitter` that buffers `{ stepId, text, ts }` lines; UI components subscribe for live log pane
- `safe-rm.ts` — wrapper around `fs.rm` that measures reclaimed bytes
- `exec.ts` — thin `execa` wrapper
- `cmd.ts` — `resolveBin` for cross-platform binary resolution
- `system.ts` — `tryWhich` for optional system tool detection

### Config (`src/config/targets.ts`)

Defines `PROJECT_TARGETS`, `FULL_TARGETS`, and per-PM cache/install commands. Add new clean targets here.

### UI layer (`src/ui/`)

All Ink/React components. `ProgressDashboard` subscribes to `logBus` for live output. `CoreSelector` / `ServerView` handle the Run Server flow. No component owns business logic — they call command functions or receive results as props.

### Build

tsup bundles `src/cli.tsx` → `dist/cli.js` (ESM, Node18 target). The `bin/nextcool.js` shim re-exports dist. `#!/usr/bin/env node` shebang is injected via tsup `banner`.

### Platform notes

`run-server.ts` uses `taskset` on Linux, `nice` + `UV_THREADPOOL_SIZE` on macOS, and a PowerShell process-tree affinity script on Windows (3 s delay to let Next.js workers spawn first).
