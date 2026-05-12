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
| `clean` | Delete `.next`, `.turbo`, `node_modules/.cache`, `.swc`, etc. |
| `purge` | Wipe package manager cache (bun / pnpm / npm / yarn) |
| `kill` | Kill all `node` / `next` processes owned by current user |
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

# Run Server (from interactive menu → Run Server)
# Select CPU cores with ← → arrows, toggle dev/start with Tab, Enter to start, ESC to stop
```

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
| `clean` | `.next`, `.turbo`, `node_modules/.cache` মুছে ফেলে |
| `purge` | bun / pnpm / npm / yarn ক্যাশ পরিষ্কার করে |
| `kill` | সব `node` / `next` প্রসেস বন্ধ করে |
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
```

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
