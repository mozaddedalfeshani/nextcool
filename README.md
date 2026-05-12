# nextcool

> Kill zombie node processes, purge caches, and rebuild your Next.js project — stop your laptop overheating.

[![npm version](https://img.shields.io/npm/v/nextcool.svg)](https://www.npmjs.com/package/nextcool)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js ≥18.18](https://img.shields.io/badge/node-%3E%3D18.18-brightgreen)](https://nodejs.org)

---

## The problem

Next.js 16 + Turbopack is powerful, but it has known issues that torch your laptop:

- **CPU spikes** — each route compilation adds ~400 MB and pins a core ([vercel/next.js#81161](https://github.com/vercel/next.js/issues/81161))
- **Memory leaks** — Apple Silicon MAP_JIT leak; `experimental.turbopackMemoryLimit` is silently broken
- **Zombie processes** — crashed `next dev` sessions leave `node` processes eating RAM
- **Bloated caches** — stale `.next`, `.turbo`, `node_modules/.cache` and global PM caches

`nextcool` fixes all of this in one command.

---

## Install

```bash
# one-off (no install needed)
npx nextcool

# global install
npm install -g nextcool
pnpm add -g nextcool
bun add -g nextcool
```

Or download a standalone binary from [GitHub Releases](https://github.com/YOUR_USERNAME/nextcool/releases) — no Node.js required.

---

## Usage

Run from inside your Next.js project directory.

```
nextcool [command] [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `cool` *(default)* | Full pipeline: kill → clean → purge cache → reinstall → rebuild |
| `clean` | Delete `.next`, `.turbo`, `node_modules/.cache`, `.swc`, etc. |
| `purge` | Wipe package manager cache (bun / pnpm / npm / yarn) |
| `kill` | Kill all `node` / `next` processes owned by current user |
| `doctor` | Diagnose environment: RAM, disk, zombies, Turbopack issues |

### Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would change without touching anything |
| `--full` | Also delete `node_modules` (implies reinstall) |
| `--webpack` | Rebuild with `--no-turbo` — workaround for Turbopack CPU/memory bugs |
| `--memory <mb>` | Set `NODE_OPTIONS=--max-old-space-size=<mb>` during rebuild |
| `--yes` | Skip all prompts — useful in CI |
| `--cwd <path>` | Target a different directory |
| `--force` | Run even if no `next` dep detected in `package.json` |
| `-v, --version` | Print version |

---

## Examples

```bash
# Full clean + rebuild (most common)
nextcool

# Just kill zombie node processes
nextcool kill

# Diagnose — no changes made
nextcool doctor

# Nuclear option: wipe everything and rebuild
nextcool cool --full

# Apple Silicon / Turbopack CPU spike fix
nextcool cool --webpack

# Cap Node memory to 4 GB during rebuild
nextcool cool --memory 4096

# Preview without touching anything
nextcool --dry-run

# CI — no prompts
nextcool cool --yes
```

---

## How it detects your package manager

`nextcool` checks for lock files in this order:

1. `bun.lockb` / `bun.lock` → **bun**
2. `pnpm-lock.yaml` → **pnpm**
3. `yarn.lock` → **yarn**
4. fallback → **npm**

---

## Why `--webpack`?

Turbopack in Next.js 16 has a known memory leak on Apple Silicon ([MAP_JIT issue](https://zenn.dev/m_naoki_m/articles/cc440272b8d0a3?locale=en)) and a CPU spike bug per route ([#81161](https://github.com/vercel/next.js/issues/81161)). The Vercel team's own recommendation for affected users is to fall back to webpack:

```bash
next build --no-turbo
# nextcool wraps this with:
nextcool cool --webpack
```

---

## Platform support

| Platform | Status |
|----------|--------|
| macOS (arm64, x64) | ✅ Tested |
| Linux (x64, arm64) | ✅ Tested |
| Windows (x64) | ✅ Supported (uses `fs.rm`, `taskkill` via `fkill`) |
| WSL | ✅ Detected and treated as Linux |

---

## Doctor output example

```
  System
  Node.js           v22.x (OK)
  Platform          darwin arm64
  RAM               16 GB total, 4.2 GB free
  Disk free         28 GB
  CPUs              10× Apple M2 Pro
  Apple Silicon     yes (MAP_JIT leak risk)

  Project
  Package manager   pnpm
  Next.js           ^16.2.0
  .next size        847 MB
  Turbopack         detected
  Webpack fallback  no

  Processes
  Zombie node/next  3 running, ~1.4 GB RSS

  Recommendations
  › .next is 847 MB — run: nextcool clean
  › 3 zombie node/next process(es) using ~1400 MB — run: nextcool kill
  › Apple Silicon + Turbopack: known MAP_JIT memory leak. Use: nextcool cool --webpack
```

---

## Contributing

```bash
git clone https://github.com/YOUR_USERNAME/nextcool
cd nextcool
pnpm install
pnpm dev        # watch mode
pnpm build      # production build
pnpm typecheck  # type check only
```

Please open issues for bugs and PRs for features. All contributions welcome.

---

## License

MIT © [Your Name]
