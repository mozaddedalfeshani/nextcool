# nextcool

> Kill zombie node processes, purge caches, rebuild your Next.js project, fix-and-verify your code before every commit, run dev/prod server with CPU core limiting, and run a CI quality gate with build reports — stop your laptop overheating.

[![npm version](https://img.shields.io/npm/v/nextcool.svg)](https://www.npmjs.com/package/nextcool)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js ≥18.18](https://img.shields.io/badge/node-%3E%3D18.18-brightgreen)](https://nodejs.org)

**[English](#english) | [বাংলা](#বাংলা)**

---

## English

### The problem

Next.js + Turbopack is powerful, but it has known issues that torch your laptop:

- **CPU spikes** — each route compile adds ~400 MB and pins a core ([vercel/next.js#81161](https://github.com/vercel/next.js/issues/81161))
- **Memory leaks** — Apple Silicon MAP_JIT leak; `experimental.turbopackMemoryLimit` is silently broken
- **Zombie processes** — crashed `next dev` sessions leave `node` processes eating RAM
- **Bloated caches** — stale `.next`, `.turbo`, `node_modules/.cache` and global PM caches

`nextcool` fixes all of this in one command — plus a one-shot `prep` gate that fixes and verifies your code before you commit, and a GitHub Action CI gate with bundle size tracking.

### ⚡ One command to ship clean code

```bash
npx nextcool prep
```

Before you commit, run this. It **auto-fixes** your code (eslint `--fix` + prettier `--write`), then **verifies** it (strict lint + format check + TypeScript) — all the slow checks run **in parallel**, so it finishes in a fraction of the time. If anything's wrong, it never spams your terminal mid-run: every task finishes, then you get one clean list of exactly what failed and why. Green output = safe to push.

**Delete the script sprawl.** No more hand-wiring `lint:fix`, `lint:strict`, `typecheck`, `format`, `format:check`, and a `fulltest` chain that runs them one-by-one:

```diff
- // ❌ before — six scripts, run sequentially
- "lint:fix":     "eslint src --fix && prettier -w .",
- "lint:strict":  "eslint --max-warnings=0 src",
- "typecheck":    "tsc --noEmit --incremental false",
- "format":       "prettier -w .",
- "format:check": "prettier -c .",
- "fulltest":     "bun lint:fix && bun lint:strict && bun typecheck && bun format:check"
```

```jsonc
// ✅ after — one command, checks run in parallel
"prep": "nextcool prep"
```

prep auto-detects your tools: eslint targets `src/` when it exists (else `.`), prettier runs on `.`, typecheck is skipped without a `tsconfig.json`. Same commands your scripts ran — just parallelized, with errors batched to the end.

### Install

```bash
# one-off (no install needed)
npx nextcool

# global install
npm install -g nextcool
pnpm add -g nextcool
bun add -g nextcool
```

### Usage

```
nextcool [command] [options]
```

Run from inside your Next.js project directory (or pass `--cwd <path>`).

### Commands

| Command | Description |
|---------|-------------|
| *(default — interactive menu)* | Choose Auto, Manual, Run Server, or Doctor with keyboard |
| `prep` 🧪 | **Pre-commit gate (beta):** auto-fix (eslint `--fix` + prettier `--write`) → parallel verify (strict lint + format check + tsc). Errors shown once at the end |
| `cool` | Full pipeline: kill → clean → purge cache → reinstall → rebuild |
| `fullclean` | Deep reset: kill → wipe `node_modules` → reinstall → lint → prettier → rebuild |
| `clean` | Delete `.next`, `.turbo`, `node_modules/.cache`, `.swc`, etc. |
| `purge` | Wipe package manager cache (bun / pnpm / npm / yarn) |
| `kill` | Kill all `node` / `next` processes owned by current user |
| `ci` | **CI quality gate:** install → typecheck → lint → format:check → build, plain output, real exit codes |
| `action-runner` | Write `.github/workflows/nextcool.yml` — one-liner GitHub Actions CI setup |
| `doctor` | Diagnose environment: RAM, disk, zombies, Turbopack issues |
| *(Run Server — menu only)* | Start dev/prod server with CPU core limiting, live logs, ESC to stop |

### Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would change without touching anything |
| `--full` | Also delete `node_modules` |
| `--webpack` | Rebuild with `--no-turbo` — Turbopack CPU/memory workaround |
| `--memory <mb>` | Set `NODE_OPTIONS=--max-old-space-size=<mb>` during rebuild |
| `--yes` | Skip all prompts (CI mode) |
| `--dev` | Boot `next dev` after the pipeline completes |
| `--prod` | Boot `next start` after the pipeline completes (forces a build) |
| `--cwd <path>` | Target a different directory |
| `--force` | Run even if no `next` dep detected |

### Examples

```bash
nextcool                    # interactive TUI menu
nextcool cool               # full pipeline, no prompts
nextcool kill               # kill zombie node processes
nextcool doctor             # diagnose, no changes
nextcool cool --full        # wipe everything and rebuild
nextcool cool --webpack     # Apple Silicon / Turbopack fix
nextcool cool --memory 4096 # cap Node.js at 4 GB RAM
nextcool --dry-run          # preview without touching anything

nextcool prep            # fix + verify (parallel) before commit
nextcool prep --dry-run  # preview the commands prep would run

nextcool clean --yes --dev  # clean, then boot `next dev`
nextcool clean --yes --prod # clean, build, then boot `next start`
nextcool fullclean --yes    # wipe node_modules → install → lint → prettier → build
nextcool fullclean --yes --prod  # ...then boot `next start`

# CI quality gate (plain output, real exit codes)
nextcool ci                        # gate only
nextcool ci --report               # gate + build report to job summary
nextcool ci --skip-install         # skip install (CI already did it)
nextcool ci --report --baseline prev.json --fail-on-growth 5

# GitHub Actions workflow generator
nextcool action-runner --yes              # detect host OS, write workflow
nextcool action-runner --yes --linux      # target ubuntu-latest
nextcool action-runner --yes --uninstall  # remove the workflow
```

---

### Command guide

#### `nextcool` (no command)
Opens the interactive TUI menu. Pick **Auto** (full pipeline), **Manual** (choose steps), **Run Server**, or **Doctor** with the keyboard. In a non-TTY shell or with `--yes`, it runs `cool` automatically.

#### `cool`
The everyday fix. Runs the full pipeline in order: **kill → clean → purge cache → reinstall → rebuild**. Use when dev is sluggish or the build is acting up.

```bash
nextcool cool --yes            # no prompts
nextcool cool --webpack        # Turbopack misbehaving → fall back to webpack
nextcool cool --memory 4096    # cap Node at 4 GB during rebuild
```

#### `fullclean`
A deeper reset than `cool`. Wipes `node_modules`, reinstalls, then runs **eslint (check) → prettier (`--write` + `--check`) → build**. eslint/prettier are skipped automatically if the project has neither a dependency nor a config file.

```bash
nextcool fullclean --yes
nextcool fullclean --yes --prod   # then boot `next start`
```

#### `clean`
Surgical artifact removal — deletes `.next`, `.turbo`, `node_modules/.cache`, `.swc`, `tsconfig.tsbuildinfo`, `.eslintcache`. Add `--full` to also drop `node_modules`. Pairs well with `--dev`/`--prod`.

```bash
nextcool clean --yes
nextcool clean --yes --dev        # clean, then `next dev`
nextcool clean --yes --prod       # clean + build, then `next start`
```

#### `purge`
Wipes the package-manager global cache (bun / pnpm / npm / yarn). Frees disk; runs without a Next.js project.

```bash
nextcool purge --yes
```

#### `kill`
Kills every `node` / `next` process owned by the current user — clears zombies from crashed `next dev` sessions.

```bash
nextcool kill --yes
```

---

#### `prep` 🧪 beta

> **Beta:** `prep` is new and still being tested. It's safe to use — non-destructive checks plus your own fixers — but the flags and output may change. [Report issues](https://github.com/mozaddedalfeshani/nextcool/issues) if you hit anything.

The pre-commit one-shot: clean up your code, prove it's clean — fast. Designed so the slow checks don't run one-after-another.

**Phase 1 — auto-fix** (sequential, edits your files): `eslint . --fix` → `prettier --write .`
**Phase 2 — verify** (parallel, read-only): `eslint . --max-warnings=0` + `prettier --check .` + `tsc --noEmit --incremental false`

Why phased? The fixers rewrite files; the checkers read them. Running both at once would race, so fixers go first, then the read-only checks run together for speed.

Errors are **deferred**: nothing fails mid-run. Every task runs to completion, then a single red panel lists each failed task with its captured console output — so you read the failures once, at the end, instead of scrolling through interleaved noise. A live TUI shows each task's status (✓ / ✗ / spinner) while it runs.

Tools are skipped automatically when absent: eslint/prettier when there's no dep or config, typecheck when there's no `tsconfig.json`.

```bash
nextcool prep              # fix + verify
nextcool prep --dry-run    # show the commands, run nothing
```

> **Running in CI?** Use [`nextcool ci`](#ci--new) instead — it's the CI twin of `prep`: plain logs, real exit codes, and no file mutation (check-only). `prep` is for your local machine before you commit.

---

#### `ci` ✨ new

CI quality gate with plain text output and real exit codes. No TUI banner — designed to read cleanly in GitHub Actions logs.

**Pipeline:** `install → typecheck (tsc) → lint (eslint) → format check (prettier) → build`

Each step fails fast. eslint/prettier are skipped automatically when absent. Typecheck is skipped when no `tsconfig.json` is found.

```bash
nextcool ci --cwd ./my-app
nextcool ci --skip-install --report
nextcool ci --report --baseline base.json --fail-on-growth 5
```

**`ci` flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--skip-install` | `false` | Skip dependency install (CI already ran it) |
| `--report` | `false` | Measure build time + bundle sizes, write `nextcool-report.json`, post to `$GITHUB_STEP_SUMMARY` |
| `--baseline <file>` | — | Previous report JSON (base branch) to diff against — adds a Δ column to the report |
| `--fail-on-growth <pct>` | `0` | Fail if client bundle grows ≥ this % vs baseline (requires `--baseline`) |
| `--report-out <file>` | `nextcool-report.json` | Where to write this run's report JSON |
| `--webpack` | `false` | Build with `--no-turbo` |
| `--memory <mb>` | — | Set `NODE_OPTIONS=--max-old-space-size` |
| `--cwd <path>` | cwd | Target directory |
| `--force` | `false` | Run even without `next` dep |

**Build report (with `--report`):**

When `--report` is set, after a successful build nextcool measures:
- **Build time** — wall-clock duration of `next build`
- **Client bundle** — size of `.next/static` (the JS that ships to users)
- **Total output** — size of `.next`

Results are written to `nextcool-report.json` and appended to the GitHub Actions job summary as a markdown table:

```
### 🧊 nextcool build report

| Metric                   | Current  | Base     | Δ                |
| Build time               | 4.9s     | 7.4s     | −2.5s (−34.4%)   |
| Client bundle (.next/static) | 716.7 KB | 716.7 KB | no change    |
| Total output (.next)     | 43.3 MB  | 41.4 MB  | +1.9 MB (+4.5%)  |
```

---

#### `action-runner`

Generates `.github/workflows/nextcool.yml` — a ready-made CI workflow using the `nextcool` composite action. Defaults to the host OS runner; override with `--linux` / `--windows` / `--mac`. Remove it with `--uninstall`.

```bash
nextcool action-runner --yes              # host OS
nextcool action-runner --yes --windows    # windows-latest
nextcool action-runner --yes --uninstall  # remove
```

The generated workflow uses `uses: mozaddedalfeshani/nextcool@v2` — see **GitHub Action** below.

---

#### `doctor`
Read-only diagnosis: RAM, free disk, zombie count, Turbopack risk signals. Changes nothing.

```bash
nextcool doctor
```

---

### GitHub Action ✨ new

Use nextcool as a one-line GitHub Actions step. It runs the `ci` quality gate, caches the build report on each push, and diffs it on pull requests — so you see bundle size changes before they merge.

```yaml
- uses: mozaddedalfeshani/nextcool@v2
```

**Inputs:**

| Input | Default | Description |
|-------|---------|-------------|
| `cwd` | `.` | Project directory (useful for monorepos) |
| `node-version` | `20` | Node.js version to set up |
| `report` | `true` | Emit build report and post to job summary |
| `fail-on-growth` | `0` | Fail if client bundle grows ≥ this % vs base branch (`0` = never fail) |
| `version` | `latest` | nextcool version to pull via `npx` |

**How base-branch diff works:**

- On **push** to your main branch: nextcool caches `nextcool-report.json` keyed by commit SHA.
- On **pull request**: the action restores the base commit's report, passes it as `--baseline`, and the job summary shows a Δ column with the difference.
- `fail-on-growth` gates the PR if the client bundle grows beyond the set percentage.

**Examples:**

```yaml
# Minimal: quality gate only, no report
- uses: actions/checkout@v4
- uses: mozaddedalfeshani/nextcool@v2
  with:
    report: "false"

# Full: gate + bundle report with 5% growth limit
- uses: actions/checkout@v4
- uses: mozaddedalfeshani/nextcool@v2
  with:
    fail-on-growth: "5"

# Monorepo: point at a specific app
- uses: actions/checkout@v4
- uses: mozaddedalfeshani/nextcool@v2
  with:
    cwd: apps/web
    fail-on-growth: "10"

# Pin to a specific version
- uses: mozaddedalfeshani/nextcool@v2
  with:
    version: "2.2.5"
```

**Full workflow example:**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: mozaddedalfeshani/nextcool@v2
        with:
          fail-on-growth: "5"
```

The action handles `setup-node`, install, build, report caching, and artifact upload automatically.

---

### Server flags (`--dev` / `--prod`)
Append to any pipeline command to boot a server once it finishes. `--dev` runs `next dev`; `--prod` runs `next start` (and forces a build first, even in `clean`). The server is CPU-limited to half your cores. Press `Ctrl+C` to stop.

### Platform support

| Platform | Status |
|----------|--------|
| macOS (arm64, x64) | ✅ |
| Linux (x64, arm64) | ✅ |
| Windows (x64) | ✅ |
| WSL | ✅ |

### Contributing

```bash
git clone https://github.com/mozaddedalfeshani/nextcool
cd nextcool
pnpm install
pnpm dev        # watch mode
pnpm build      # production build
pnpm typecheck
```

---

## বাংলা

### সমস্যাটা কী?

Next.js + Turbopack শক্তিশালী, কিন্তু এটি ল্যাপটপ গরম করে দেয়:

- **CPU স্পাইক** — প্রতিটি রুট কম্পাইলে ~400 MB যোগ হয় এবং CPU পিন হয়ে যায় ([vercel/next.js#81161](https://github.com/vercel/next.js/issues/81161))
- **মেমোরি লিক** — Apple Silicon-এ MAP_JIT লিক; `turbopackMemoryLimit` কাজ করে না
- **জম্বি প্রসেস** — ক্র্যাশ হওয়া `next dev` সেশন থেকে `node` প্রসেস RAM খেতে থাকে
- **ফোলা ক্যাশ** — পুরনো `.next`, `.turbo`, `node_modules/.cache` জমে থাকে

`nextcool` একটি কমান্ডে সব ঠিক করে দেয় — সাথে `prep` গেট যা কমিটের আগে কোড ফিক্স ও যাচাই করে, এবং GitHub Action CI গেট, বান্ডেল সাইজ ট্র্যাকিং সহ।

### ⚡ এক কমান্ডে ক্লিন কোড

```bash
npx nextcool prep
```

কমিট করার আগে এটি চালান। প্রথমে কোড **অটো-ফিক্স** করে (eslint `--fix` + prettier `--write`), তারপর **যাচাই** করে (strict lint + format check + TypeScript) — ধীর চেকগুলো **একসাথে (parallel)** চলে, তাই অনেক কম সময়ে শেষ হয়। কোনো সমস্যা হলে চলার মাঝে টার্মিনাল ভরিয়ে দেয় না: সব টাস্ক শেষ হওয়ার পর একবারে দেখায় ঠিক কোনটা কেন ফেল করেছে। সব সবুজ = নিশ্চিন্তে push করুন।

**অনেকগুলো স্ক্রিপ্ট আর লিখতে হবে না।** `lint:fix`, `lint:strict`, `typecheck`, `format`, `format:check` আর একটা `fulltest` চেইন হাতে লেখার দরকার নেই:

```diff
- // ❌ আগে — ছয়টা স্ক্রিপ্ট, একের পর এক চলে
- "lint:fix":     "eslint src --fix && prettier -w .",
- "lint:strict":  "eslint --max-warnings=0 src",
- "typecheck":    "tsc --noEmit --incremental false",
- "format":       "prettier -w .",
- "format:check": "prettier -c .",
- "fulltest":     "bun lint:fix && bun lint:strict && bun typecheck && bun format:check"
```

```jsonc
// ✅ পরে — এক কমান্ড, চেক parallel-এ চলে
"prep": "nextcool prep"
```

prep নিজে টুল শনাক্ত করে: src/ থাকলে eslint `src`-এ চলে (নাহলে `.`), prettier `.`-এ, `tsconfig.json` না থাকলে typecheck বাদ। আপনার স্ক্রিপ্টের একই কমান্ড — শুধু parallel, আর এরর শেষে একবারে।

### ইনস্টল

```bash
# একবার চালানোর জন্য (ইনস্টল ছাড়াই)
npx nextcool

# গ্লোবাল ইনস্টল
npm install -g nextcool
pnpm add -g nextcool
bun add -g nextcool
```

### ব্যবহার

```bash
nextcool [command] [options]
```

আপনার Next.js প্রজেক্ট ডিরেক্টরি থেকে চালান (অথবা `--cwd <path>` দিন)।

### কমান্ড তালিকা

| কমান্ড | কাজ |
|--------|-----|
| *(ডিফল্ট — মেনু)* | Auto, Manual, Run Server বা Doctor মোড বেছে নিন |
| `prep` 🧪 | **প্রি-কমিট গেট (beta):** অটো-ফিক্স (eslint `--fix` + prettier `--write`) → parallel যাচাই (strict lint + format check + tsc)। এরর শেষে একবারে দেখায় |
| `cool` | সম্পূর্ণ পাইপলাইন: kill → clean → cache মুছে → reinstall → rebuild |
| `fullclean` | গভীর রিসেট: kill → `node_modules` মুছে → reinstall → lint → prettier → rebuild |
| `clean` | `.next`, `.turbo`, `node_modules/.cache` মুছে ফেলে |
| `purge` | bun / pnpm / npm / yarn ক্যাশ পরিষ্কার করে |
| `kill` | সব `node` / `next` প্রসেস বন্ধ করে |
| `ci` | **CI কোয়ালিটি গেট:** install → typecheck → lint → format:check → build, plain আউটপুট, real exit code |
| `action-runner` | `.github/workflows/nextcool.yml` তৈরি করে — GitHub Actions CI সেটআপ |
| `doctor` | সিস্টেম ডায়াগনোসিস করে — RAM, ডিস্ক, জম্বি প্রসেস |
| *(Run Server — মেনু থেকে)* | CPU কোর সীমিত করে dev/start সার্ভার চালায় |

### ফ্ল্যাগ

| ফ্ল্যাগ | কাজ |
|--------|-----|
| `--dry-run` | কিছু না করে শুধু দেখায় কী হতো |
| `--full` | `node_modules`ও মুছে দেয় |
| `--webpack` | Turbopack বাদ দিয়ে webpack দিয়ে build করে |
| `--memory <mb>` | Node.js-এর সর্বোচ্চ RAM সেট করে |
| `--yes` | কোনো প্রশ্ন না করে চালায় (CI-এর জন্য) |
| `--dev` | পাইপলাইন শেষ হলে `next dev` চালু করে |
| `--prod` | পাইপলাইন শেষ হলে `next start` চালু করে (build বাধ্যতামূলক) |
| `--cwd <path>` | অন্য ডিরেক্টরিতে চালায় |
| `--force` | `next` ডিপেন্ডেন্সি না থাকলেও চালায় |

### উদাহরণ

```bash
nextcool                    # ইন্টারেক্টিভ মেনু
nextcool cool               # সম্পূর্ণ পরিষ্কার + রিবিল্ড
nextcool kill               # জম্বি প্রসেস বন্ধ করুন
nextcool doctor             # সিস্টেম চেক করুন
nextcool cool --full        # node_modules সহ সব মুছে রিবিল্ড
nextcool cool --webpack     # Apple Silicon / Turbopack সমস্যার সমাধান
nextcool cool --memory 4096 # Node.js-কে ৪ GB RAM-এ সীমাবদ্ধ রাখুন
nextcool --dry-run          # কিছু না করে শুধু দেখুন

nextcool prep            # কমিটের আগে ফিক্স + যাচাই (parallel)
nextcool prep --dry-run  # prep কী কী চালাবে শুধু দেখুন

nextcool clean --yes --dev  # পরিষ্কার করে `next dev` চালু করুন
nextcool clean --yes --prod # পরিষ্কার + build করে `next start` চালু করুন
nextcool fullclean --yes    # node_modules মুছে → install → lint → prettier → build

# CI কোয়ালিটি গেট
nextcool ci                              # শুধু গেট
nextcool ci --report                     # গেট + বিল্ড রিপোর্ট
nextcool ci --skip-install --report      # install বাদ দিয়ে চালান
nextcool ci --report --baseline base.json --fail-on-growth 5

# GitHub Actions ওয়ার্কফ্লো জেনারেটর
nextcool action-runner --yes              # হোস্ট OS শনাক্ত করে ওয়ার্কফ্লো লেখে
nextcool action-runner --yes --linux      # ubuntu-latest টার্গেট করে
nextcool action-runner --yes --uninstall  # ওয়ার্কফ্লো মুছে ফেলে
```

---

### কমান্ড গাইড

#### `nextcool` (কমান্ড ছাড়া)
ইন্টারেক্টিভ মেনু খোলে। কীবোর্ড দিয়ে **Auto** (সম্পূর্ণ পাইপলাইন), **Manual** (ধাপ বেছে নিন), **Run Server**, বা **Doctor** বেছে নিন। non-TTY শেল বা `--yes` দিলে স্বয়ংক্রিয়ভাবে `cool` চলে।

#### `cool`
প্রতিদিনের সমাধান। ক্রমে সম্পূর্ণ পাইপলাইন চালায়: **kill → clean → cache মুছে → reinstall → rebuild**।

```bash
nextcool cool --yes
nextcool cool --webpack
nextcool cool --memory 4096
```

#### `prep` 🧪 beta

> **Beta:** `prep` নতুন, এখনও টেস্ট চলছে। ব্যবহার নিরাপদ — শুধু চেক ও আপনার নিজের ফিক্সার — তবে flag ও আউটপুট পরিবর্তন হতে পারে। সমস্যা হলে [রিপোর্ট করুন](https://github.com/mozaddedalfeshani/nextcool/issues)।

কমিটের আগের এক-শট: কোড পরিষ্কার করে, প্রমাণ করে যে পরিষ্কার — দ্রুত।

**ধাপ ১ — অটো-ফিক্স** (ক্রমে, ফাইল বদলায়): `eslint . --fix` → `prettier --write .`
**ধাপ ২ — যাচাই** (parallel, read-only): `eslint . --max-warnings=0` + `prettier --check .` + `tsc --noEmit --incremental false`

ফিক্সাররা ফাইল লেখে, চেকাররা পড়ে — একসাথে চালালে দ্বন্দ্ব হতো, তাই আগে ফিক্স, পরে read-only চেকগুলো একসাথে (দ্রুততার জন্য)। এরর চলার মাঝে দেখায় না: সব টাস্ক শেষ হলে একটি লাল প্যানেলে প্রতিটি ফেল হওয়া টাস্ক ও তার আউটপুট একবারে দেখায়। চলার সময় লাইভ TUI প্রতিটি টাস্কের স্ট্যাটাস (✓ / ✗ / spinner) দেখায়। টুল না থাকলে (eslint/prettier/tsconfig) সেই ধাপ স্বয়ংক্রিয়ভাবে বাদ পড়ে।

```bash
nextcool prep              # ফিক্স + যাচাই
nextcool prep --dry-run    # কমান্ডগুলো দেখায়, কিছু চালায় না
```

> **CI-তে চালাবেন?** তাহলে [`nextcool ci`](#ci--new) ব্যবহার করুন — এটি `prep`-এর CI সংস্করণ: plain লগ, real exit code, ফাইল বদলায় না (শুধু চেক)। `prep` লোকাল মেশিনে কমিটের আগের জন্য।

#### `fullclean`
`cool`-এর চেয়ে গভীর রিসেট। `node_modules` মুছে, reinstall করে, তারপর **eslint → prettier → build** চালায়।

```bash
nextcool fullclean --yes
nextcool fullclean --yes --prod
```

#### `clean`
নির্দিষ্ট আর্টিফ্যাক্ট মুছে। `--full` দিলে `node_modules`ও মুছে যায়।

```bash
nextcool clean --yes
nextcool clean --yes --dev
nextcool clean --yes --prod
```

#### `purge`
প্যাকেজ ম্যানেজারের গ্লোবাল ক্যাশ মুছে। Next.js প্রজেক্ট ছাড়াই চলে।

```bash
nextcool purge --yes
```

#### `kill`
বর্তমান ইউজারের সব `node` / `next` প্রসেস বন্ধ করে।

```bash
nextcool kill --yes
```

---

#### `ci` ✨ নতুন

CI কোয়ালিটি গেট। plain text আউটপুট, real exit code। GitHub Actions লগে পরিষ্কার দেখায়।

**পাইপলাইন:** `install → typecheck (tsc) → lint (eslint) → format check (prettier) → build`

eslint/prettier না থাকলে সেই ধাপ এড়িয়ে যায়। `tsconfig.json` না থাকলে typecheck-ও এড়িয়ে যায়।

**`ci` ফ্ল্যাগ:**

| ফ্ল্যাগ | ডিফল্ট | কাজ |
|--------|--------|-----|
| `--skip-install` | `false` | install এড়িয়ে যায় (CI আগেই করেছে) |
| `--report` | `false` | build সময় + বান্ডেল সাইজ মাপে, `nextcool-report.json` লেখে, job summary-তে পোস্ট করে |
| `--baseline <file>` | — | আগের রিপোর্ট JSON (base branch) — Δ কলাম দেখায় |
| `--fail-on-growth <pct>` | `0` | client bundle এতটুকু % বাড়লে fail করে |
| `--report-out <file>` | `nextcool-report.json` | রিপোর্ট JSON কোথায় লিখবে |
| `--webpack` | `false` | `--no-turbo` দিয়ে build করে |
| `--memory <mb>` | — | `NODE_OPTIONS=--max-old-space-size` সেট করে |
| `--cwd <path>` | cwd | টার্গেট ডিরেক্টরি |
| `--force` | `false` | `next` dep না থাকলেও চালায় |

**বিল্ড রিপোর্ট (--report দিলে):**

সফল build-এর পর job summary-তে markdown table দেখায়:

```
| Metric                        | Current  | Base     | Δ              |
| Build time                    | 4.9s     | 7.4s     | −2.5s (−34.4%) |
| Client bundle (.next/static)  | 716.7 KB | 716.7 KB | no change      |
| Total output (.next)          | 43.3 MB  | 41.4 MB  | +1.9 MB (+4.5%)|
```

---

#### `action-runner`

`.github/workflows/nextcool.yml` তৈরি করে — `mozaddedalfeshani/nextcool@v2` composite action ব্যবহার করে। `--linux` / `--windows` / `--mac` দিয়ে রানার বদলান, `--uninstall` দিয়ে মুছুন।

```bash
nextcool action-runner --yes
nextcool action-runner --yes --linux
nextcool action-runner --yes --uninstall
```

#### `doctor`
শুধু পড়ার ডায়াগনোসিস: RAM, ফাঁকা ডিস্ক, জম্বি সংখ্যা, Turbopack ঝুঁকির সংকেত।

```bash
nextcool doctor
```

---

### GitHub Action ✨ নতুন

nextcool-কে একটি লাইনে GitHub Actions step হিসেবে ব্যবহার করুন। CI কোয়ালিটি গেট চালায়, push-এ বিল্ড রিপোর্ট ক্যাশ করে, PR-এ বেস ব্রাঞ্চের সাথে তুলনা দেখায়।

```yaml
- uses: mozaddedalfeshani/nextcool@v2
```

**ইনপুট:**

| ইনপুট | ডিফল্ট | কাজ |
|-------|--------|-----|
| `cwd` | `.` | প্রজেক্ট ডিরেক্টরি (monorepo-তে কাজের) |
| `node-version` | `20` | Node.js ভার্সন |
| `report` | `true` | বিল্ড রিপোর্ট দেখায় এবং job summary-তে পোস্ট করে |
| `fail-on-growth` | `0` | client bundle এতটুকু % বাড়লে PR fail করে (0 = কখনো fail করবে না) |
| `version` | `latest` | `npx` দিয়ে কোন nextcool ভার্সন চালাবে |

**সম্পূর্ণ ওয়ার্কফ্লো উদাহরণ:**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: mozaddedalfeshani/nextcool@v2
        with:
          fail-on-growth: "5"
```

এই action নিজেই `setup-node`, install, build, রিপোর্ট ক্যাশিং এবং artifact আপলোড সামলায়।

### সার্ভার ফ্ল্যাগ (`--dev` / `--prod`)
যেকোনো পাইপলাইন কমান্ডে যোগ করলে শেষ হওয়ার পর সার্ভার চালু হয়। `--dev` চালায় `next dev`; `--prod` চালায় `next start`। সার্ভার আপনার অর্ধেক CPU কোরে সীমাবদ্ধ। বন্ধ করতে `Ctrl+C` চাপুন।

### প্ল্যাটফর্ম সাপোর্ট

| প্ল্যাটফর্ম | অবস্থা |
|-------------|--------|
| macOS (arm64, x64) | ✅ |
| Linux (x64, arm64) | ✅ |
| Windows (x64) | ✅ |
| WSL | ✅ |

### কন্ট্রিবিউট করুন

```bash
git clone https://github.com/mozaddedalfeshani/nextcool
cd nextcool
pnpm install
pnpm dev
```

ইস্যু এবং পুল রিকোয়েস্ট স্বাগত।

---

## License

MIT © [mozaddedalfeshani](https://github.com/mozaddedalfeshani)
