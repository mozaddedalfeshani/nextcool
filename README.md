# nextcool

> Kill zombie node processes, purge caches, rebuild your Next.js project, fix-and-verify your code before every commit, run dev/prod server with CPU core limiting, and run a CI quality gate with build reports — stop your laptop overheating.

[![npm version](https://img.shields.io/npm/v/nextcool.svg)](https://www.npmjs.com/package/nextcool)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js ≥18.18](https://img.shields.io/badge/node-%3E%3D18.18-brightgreen)](https://nodejs.org)

**[English](#english) | [বাংলা](#বাংলা)**

---

## English

### Install

```bash
npx nextcool          # no install needed
pnpm add -g nextcool
bun add -g nextcool
```

---

### Local use

#### Dev environment acting up?

```bash
nextcool cool
```

Kills zombie processes, clears all caches, reinstalls deps, rebuilds. One command, done.

Need more? Add flags:

```bash
nextcool cool --full         # also wipe node_modules
nextcool cool --webpack      # switch off Turbopack
nextcool cool --memory 4096  # cap Node.js at 4 GB
nextcool cool --dev          # boot next dev when finished
```

Or open the interactive menu to pick what to run:

```bash
nextcool
```

#### Before every commit

```bash
nextcool prep
```

**Phase 1** (sequential — edits your files): `eslint --fix` → `prettier --write`
**Phase 2** (parallel — read only): `eslint --max-warnings=0` + `prettier --check` + `tsc --noEmit`

All three phase-2 checks run at the same time. If something fails, errors are shown once at the end — not mid-run. Missing tools (eslint, prettier, tsconfig) are skipped automatically.

---

### In GitHub Actions

```bash
bun x nextcool prep --ci
```

`--ci` skips the auto-fix phase (no file mutations on a runner) and runs the three checks in parallel with plain log output.

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: oven-sh/setup-bun@v2
  - run: bun install --frozen-lockfile
  - run: bun x nextcool prep --ci
  - run: bun run test
```

Actions log output:
```
▶ Lint strict (max-warnings 0)
▶ Format --check (prettier)
▶ Typecheck (tsc)
✓ Format --check (prettier) — passed (1.2s)
✓ Typecheck (tsc) — passed (3.4s)
✓ Lint strict (max-warnings 0) — passed (5.1s)

prep passed
```

#### Want bundle size tracking too?

Use the official GitHub Action instead. It runs the quality gate, measures bundle size, and posts a report to the job summary. On pull requests it diffs against the base branch.

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: mozaddedalfeshani/nextcool@v2
    with:
      fail-on-growth: "5"   # fail PR if bundle grows > 5%
```

| Input | Default | Description |
|-------|---------|-------------|
| `cwd` | `.` | Project directory (monorepo support) |
| `report` | `true` | Post build report to job summary |
| `fail-on-growth` | `0` | Fail if client bundle grows ≥ N% vs base |
| `node-version` | `20` | Node.js version |

---

### All commands

| Command | What it does |
|---------|-------------|
| *(default)* | Interactive menu |
| `cool` | Kill → clean → reinstall → rebuild |
| `fullclean` | Wipe `node_modules` → reinstall → lint → rebuild |
| `clean` | Delete `.next`, `.turbo`, `node_modules/.cache` |
| `purge` | Wipe package manager cache |
| `kill` | Kill zombie node/next processes |
| `prep` | Fix + verify before committing (local TUI) |
| `prep --ci` | Verify only, parallel, plain output (CI) |
| `doctor` | Check RAM, disk, zombies — read only |

### Platform support

macOS ✅ · Linux ✅ · Windows ✅ · WSL ✅

### Contributing

```bash
git clone https://github.com/mozaddedalfeshani/nextcool
cd nextcool
pnpm install && pnpm dev
```

---

## বাংলা

### ইনস্টল

```bash
npx nextcool          # ইনস্টল লাগবে না
pnpm add -g nextcool
bun add -g nextcool
```

---

### লোকাল ব্যবহার

#### dev পরিবেশ সমস্যা করছে?

```bash
nextcool cool
```

zombie প্রসেস বন্ধ করে, সব cache মুছে, deps reinstall করে, rebuild করে। এক কমান্ডে শেষ।

আরও দরকার? flag যোগ করুন:

```bash
nextcool cool --full         # node_modules-ও মুছে দেয়
nextcool cool --webpack      # Turbopack বন্ধ করে
nextcool cool --memory 4096  # Node.js 4 GB-এ সীমা
nextcool cool --dev          # শেষ হলে next dev চালু
```

মেনু থেকে বেছে চালাতে:

```bash
nextcool
```

#### প্রতিটি কমিটের আগে

```bash
nextcool prep
```

**ধাপ ১** (ক্রমে — ফাইল বদলায়): `eslint --fix` → `prettier --write`
**ধাপ ২** (parallel — read only): `eslint --max-warnings=0` + `prettier --check` + `tsc --noEmit`

ধাপ ২-এর তিনটি চেক একসাথে চলে। কিছু fail করলে শেষে একবারে দেখায়। eslint, prettier, বা tsconfig না থাকলে সেই ধাপ এড়িয়ে যায়।

---

### GitHub Actions-এ

```bash
bun x nextcool prep --ci
```

`--ci` দিলে auto-fix ধাপ বাদ পড়ে (runner-এ ফাইল বদলানো ঠিক না), তিনটি চেক parallel-এ চলে, plain log আউটপুট।

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: oven-sh/setup-bun@v2
  - run: bun install --frozen-lockfile
  - run: bun x nextcool prep --ci
  - run: bun run test
```

#### bundle size ট্র্যাক করতে চান?

অফিশিয়াল GitHub Action ব্যবহার করুন। quality gate চালায়, bundle size মাপে, job summary-তে রিপোর্ট দেয়। PR-এ base branch-এর সাথে তুলনা করে।

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: mozaddedalfeshani/nextcool@v2
    with:
      fail-on-growth: "5"   # bundle 5%-এর বেশি বাড়লে PR fail
```

| ইনপুট | ডিফল্ট | কাজ |
|-------|--------|-----|
| `cwd` | `.` | প্রজেক্ট ডিরেক্টরি |
| `report` | `true` | build রিপোর্ট job summary-তে |
| `fail-on-growth` | `0` | bundle এতটুকু % বাড়লে fail |
| `node-version` | `20` | Node.js ভার্সন |

---

### সব কমান্ড

| কমান্ড | কাজ |
|--------|-----|
| *(ডিফল্ট)* | ইন্টারেক্টিভ মেনু |
| `cool` | kill → clean → reinstall → rebuild |
| `fullclean` | `node_modules` মুছে → reinstall → lint → rebuild |
| `clean` | `.next`, `.turbo`, `node_modules/.cache` মুছে |
| `purge` | package manager cache পরিষ্কার |
| `kill` | zombie node/next প্রসেস বন্ধ |
| `prep` | কমিটের আগে ফিক্স + যাচাই (local TUI) |
| `prep --ci` | শুধু যাচাই, parallel, plain আউটপুট (CI) |
| `doctor` | RAM, ডিস্ক, zombie দেখে — কিছু বদলায় না |

### প্ল্যাটফর্ম

macOS ✅ · Linux ✅ · Windows ✅ · WSL ✅

### কন্ট্রিবিউট

```bash
git clone https://github.com/mozaddedalfeshani/nextcool
cd nextcool
pnpm install && pnpm dev
```

---

## License

MIT © [mozaddedalfeshani](https://github.com/mozaddedalfeshani)
