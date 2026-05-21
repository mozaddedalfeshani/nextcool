# nextcool v2.0

> Kill zombie node processes, purge caches, rebuild your Next.js project, and run dev/prod server with CPU core limiting — stop your laptop overheating.

[![npm version](https://img.shields.io/npm/v/nextcool.svg)](https://www.npmjs.com/package/nextcool)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js ≥18.18](https://img.shields.io/badge/node-%3E%3D18.18-brightgreen)](https://nodejs.org)

**[English](#english) | [বাংলা](#বাংলা)**

---

## English

### The problem

Next.js 16 + Turbopack is powerful, but it has known issues that torch your laptop:

- **CPU spikes** — each route compile adds ~400 MB and pins a core ([vercel/next.js#81161](https://github.com/vercel/next.js/issues/81161))
- **Memory leaks** — Apple Silicon MAP_JIT leak; `experimental.turbopackMemoryLimit` is silently broken
- **Zombie processes** — crashed `next dev` sessions leave `node` processes eating RAM
- **Bloated caches** — stale `.next`, `.turbo`, `node_modules/.cache` and global PM caches

`nextcool` fixes all of this in one command.

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

Run from inside your Next.js project directory.

```
nextcool [command] [options]
```

### Commands

| Command | Description |
|---------|-------------|
| *(default — interactive menu)* | Choose Auto, Manual, Run Server, or Doctor with keyboard |
| `cool` | Full pipeline: kill → clean → purge cache → reinstall → rebuild |
| `fullclean` | Deep reset: kill → wipe `node_modules` → reinstall → lint → prettier → rebuild |
| `clean` | Delete `.next`, `.turbo`, `node_modules/.cache`, `.swc`, etc. |
| `purge` | Wipe package manager cache (bun / pnpm / npm / yarn) |
| `kill` | Kill all `node` / `next` processes owned by current user |
| `action-runner` | Write a GitHub Actions workflow (`.github/workflows/nextcool.yml`) that runs `fullclean` in CI |
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

`action-runner` flags: `--linux` / `--windows` / `--mac` pick the runner (default: host OS), `--install` writes the workflow (default), `--uninstall` removes it.

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

nextcool clean --yes --dev  # clean, then boot `next dev`
nextcool clean --yes --prod # clean, build, then boot `next start`
nextcool fullclean --yes    # wipe node_modules → install → lint → prettier → build
nextcool fullclean --yes --prod  # ...then boot `next start`

# GitHub Actions CI workflow generator
nextcool action-runner --yes              # detect host OS, write workflow
nextcool action-runner --yes --linux      # target ubuntu-latest
nextcool action-runner --yes --uninstall  # remove the workflow

# Run Server (from interactive menu → Run Server)
# Select CPU cores with ← → arrows, toggle dev/start with Tab, Enter to start, ESC to stop
```

### Command guide

#### `nextcool` (no command)
Opens the interactive TUI menu. Pick **Auto** (full pipeline), **Manual** (choose steps), **Run Server**, or **Doctor** with the keyboard. In a non-TTY shell or with `--yes`, it runs `cool` automatically.

```bash
nextcool
```

#### `cool`
The everyday fix. Runs the full pipeline in order: **kill → clean → purge cache → reinstall → rebuild**. Use when dev is sluggish or the build is acting up.

```bash
nextcool cool --yes            # no prompts
nextcool cool --webpack        # Turbopack misbehaving → fall back to webpack
nextcool cool --memory 4096    # cap Node at 4 GB during rebuild
```

#### `fullclean`
A deeper reset than `cool`. Wipes `node_modules`, reinstalls, then runs **eslint (check) → prettier (`--write` + `--check`) → build**. eslint/prettier are skipped automatically if the project has neither a dependency nor a config file. Use before a release or when dependencies are corrupted.

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

#### `action-runner`
Generates `.github/workflows/nextcool.yml` that runs `nextcool fullclean` in CI. Defaults to the host OS runner; override with `--linux` / `--windows` / `--mac`. Remove it with `--uninstall`.

```bash
nextcool action-runner --yes              # host OS
nextcool action-runner --yes --windows    # windows-latest
nextcool action-runner --yes --uninstall  # remove
```

#### `doctor`
Read-only diagnosis: RAM, free disk, zombie count, Turbopack risk signals. Changes nothing.

```bash
nextcool doctor
```

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

Next.js 16 + Turbopack শক্তিশালী, কিন্তু এটি ল্যাপটপ গরম করে দেয়:

- **CPU স্পাইক** — প্রতিটি রুট কম্পাইলে ~400 MB যোগ হয় এবং CPU পিন হয়ে যায় ([vercel/next.js#81161](https://github.com/vercel/next.js/issues/81161))
- **মেমোরি লিক** — Apple Silicon-এ MAP_JIT লিক; `turbopackMemoryLimit` কাজ করে না
- **জম্বি প্রসেস** — ক্র্যাশ হওয়া `next dev` সেশন থেকে `node` প্রসেস RAM খেতে থাকে
- **ফোলা ক্যাশ** — পুরনো `.next`, `.turbo`, `node_modules/.cache` জমে থাকে

`nextcool` একটি কমান্ডে সব ঠিক করে দেয়।

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

আপনার Next.js প্রজেক্ট ডিরেক্টরি থেকে চালান।

```bash
nextcool          # ইন্টারেক্টিভ মেনু খুলবে
```

### কমান্ড তালিকা

| কমান্ড | কাজ |
|--------|-----|
| *(ডিফল্ট — মেনু)* | Auto, Manual, Run Server বা Doctor মোড বেছে নিন |
| `cool` | সম্পূর্ণ পাইপলাইন: kill → clean → cache মুছে → reinstall → rebuild |
| `fullclean` | গভীর রিসেট: kill → `node_modules` মুছে → reinstall → lint → prettier → rebuild |
| `clean` | `.next`, `.turbo`, `node_modules/.cache` মুছে ফেলে |
| `purge` | bun / pnpm / npm / yarn ক্যাশ পরিষ্কার করে |
| `kill` | সব `node` / `next` প্রসেস বন্ধ করে |
| `action-runner` | GitHub Actions ওয়ার্কফ্লো (`.github/workflows/nextcool.yml`) তৈরি করে যা CI-তে `fullclean` চালায় |
| `doctor` | সিস্টেম ডায়াগনোসিস করে — RAM, ডিস্ক, জম্বি প্রসেস |
| *(Run Server — মেনু থেকে)* | CPU কোর সীমিত করে dev/start সার্ভার চালায়, ESC দিয়ে বন্ধ করুন |

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

`action-runner` ফ্ল্যাগ: `--linux` / `--windows` / `--mac` রানার বেছে নেয় (ডিফল্ট: হোস্ট OS), `--install` ওয়ার্কফ্লো লেখে (ডিফল্ট), `--uninstall` মুছে ফেলে।

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

nextcool clean --yes --dev  # পরিষ্কার করে `next dev` চালু করুন
nextcool clean --yes --prod # পরিষ্কার + build করে `next start` চালু করুন
nextcool fullclean --yes    # node_modules মুছে → install → lint → prettier → build
nextcool fullclean --yes --prod  # ...তারপর `next start` চালু করুন

# GitHub Actions CI ওয়ার্কফ্লো জেনারেটর
nextcool action-runner --yes              # হোস্ট OS শনাক্ত করে ওয়ার্কফ্লো লেখে
nextcool action-runner --yes --linux      # ubuntu-latest টার্গেট করে
nextcool action-runner --yes --uninstall  # ওয়ার্কফ্লো মুছে ফেলে
```

### কমান্ড গাইড

#### `nextcool` (কমান্ড ছাড়া)
ইন্টারেক্টিভ মেনু খোলে। কীবোর্ড দিয়ে **Auto** (সম্পূর্ণ পাইপলাইন), **Manual** (ধাপ বেছে নিন), **Run Server**, বা **Doctor** বেছে নিন। non-TTY শেল বা `--yes` দিলে স্বয়ংক্রিয়ভাবে `cool` চলে।

```bash
nextcool
```

#### `cool`
প্রতিদিনের সমাধান। ক্রমে সম্পূর্ণ পাইপলাইন চালায়: **kill → clean → cache মুছে → reinstall → rebuild**। dev ধীর হলে বা build সমস্যা করলে ব্যবহার করুন।

```bash
nextcool cool --yes            # প্রশ্ন ছাড়া
nextcool cool --webpack        # Turbopack সমস্যা করলে webpack-এ ফিরে যান
nextcool cool --memory 4096    # rebuild-এ Node 4 GB-তে সীমাবদ্ধ
```

#### `fullclean`
`cool`-এর চেয়ে গভীর রিসেট। `node_modules` মুছে, reinstall করে, তারপর **eslint (check) → prettier (`--write` + `--check`) → build** চালায়। প্রজেক্টে eslint/prettier-এর ডিপেন্ডেন্সি বা কনফিগ না থাকলে ধাপটি বাদ পড়ে। রিলিজের আগে বা ডিপেন্ডেন্সি নষ্ট হলে ব্যবহার করুন।

```bash
nextcool fullclean --yes
nextcool fullclean --yes --prod   # তারপর `next start` চালু
```

#### `clean`
নির্দিষ্ট আর্টিফ্যাক্ট মুছে — `.next`, `.turbo`, `node_modules/.cache`, `.swc`, `tsconfig.tsbuildinfo`, `.eslintcache`। `--full` দিলে `node_modules`ও মুছে যায়। `--dev`/`--prod`-এর সাথে ভালো কাজ করে।

```bash
nextcool clean --yes
nextcool clean --yes --dev        # পরিষ্কার করে `next dev`
nextcool clean --yes --prod       # পরিষ্কার + build করে `next start`
```

#### `purge`
প্যাকেজ ম্যানেজারের গ্লোবাল ক্যাশ (bun / pnpm / npm / yarn) মুছে। ডিস্ক খালি করে; Next.js প্রজেক্ট ছাড়াই চলে।

```bash
nextcool purge --yes
```

#### `kill`
বর্তমান ইউজারের সব `node` / `next` প্রসেস বন্ধ করে — ক্র্যাশ হওয়া `next dev` সেশনের জম্বি পরিষ্কার করে।

```bash
nextcool kill --yes
```

#### `action-runner`
`.github/workflows/nextcool.yml` তৈরি করে যা CI-তে `nextcool fullclean` চালায়। ডিফল্টে হোস্ট OS রানার; `--linux` / `--windows` / `--mac` দিয়ে বদলান। `--uninstall` দিয়ে মুছুন।

```bash
nextcool action-runner --yes              # হোস্ট OS
nextcool action-runner --yes --windows    # windows-latest
nextcool action-runner --yes --uninstall  # মুছে ফেলুন
```

#### `doctor`
শুধু পড়ার ডায়াগনোসিস: RAM, ফাঁকা ডিস্ক, জম্বি সংখ্যা, Turbopack ঝুঁকির সংকেত। কিছু পরিবর্তন করে না।

```bash
nextcool doctor
```

### সার্ভার ফ্ল্যাগ (`--dev` / `--prod`)
যেকোনো পাইপলাইন কমান্ডে যোগ করলে শেষ হওয়ার পর সার্ভার চালু হয়। `--dev` চালায় `next dev`; `--prod` চালায় `next start` (এবং `clean`-এও আগে build বাধ্যতামূলক)। সার্ভার আপনার অর্ধেক CPU কোরে সীমাবদ্ধ থাকে। বন্ধ করতে `Ctrl+C` চাপুন।

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
