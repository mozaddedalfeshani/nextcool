# nextcool

> 🔥 **Stop your laptop overheating.** Kill zombie node processes, purge caches, rebuild your React project — Next.js, Vite, Expo, React Native, Electron, Remix, Gatsby, Astro, CRA, and more. Fix-and-verify code before every commit, run dev/prod servers with CPU core limiting, measure bundle size, and run CI quality gates with build reports.

[![npm version](https://img.shields.io/npm/v/nextcool.svg)](https://www.npmjs.com/package/nextcool)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js ≥18.18](https://img.shields.io/badge/node-%3E%3D18.18-brightgreen)](https://nodejs.org)
[![macOS | Linux | Windows](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue)](https://github.com/mozaddedalfeshani/nextcool)

**[English](#english) | [বাংলা](#বাংলা)**

---

## 🚀 Features at a Glance

✅ **One-Click Cleanup** — Kill zombies, wipe caches, reinstall deps, rebuild  
✅ **Multi-Framework** — Auto-detects Next.js, Vite, Expo, Electron, Remix, and more  
✅ **Pre-Commit Quality** — Auto-fix + verify code in 30 seconds  
✅ **CI Quality Gate** — Full pipeline with real exit codes  
✅ **Bundle Tracking** — Measure, diff, fail on growth (`.next`, `dist`, etc.)  
✅ **CPU Limiting** — Run dev/prod servers with CPU affinity  
✅ **Smart Diagnostics** — Check RAM, disk, zombies, framework + Turbopack (Next.js)  
✅ **GitHub Actions Ready** — Official Action + CLI  
✅ **Cross-Platform** — macOS, Linux, Windows, WSL  

---

## English

### 🎯 Why nextcool?

**The Problem:**
- Dev server crashes → you kill the process manually
- Cache is corrupted → you manually `rm -rf .next`, `dist`, `.vite`, `.turbo`…
- Dependencies conflict → you manually reinstall
- Code quality → you check linting before push (slow!)
- Bundle size grows → you have no idea until CI fails
- Laptop melting → it's the dev server hogging CPU (Next.js, Vite, Metro, Expo…)

**nextcool fixes all of this in ONE command.**

---

### Supported Frameworks

nextcool reads `package.json` and picks the right clean targets, build command, and dev/prod server automatically. Prefer `npm run build` / `npm run dev` when those scripts exist.

| Framework | Detected via | Clean targets (examples) | Build fallback |
|-----------|--------------|--------------------------|----------------|
| **Next.js** | `next` | `.next`, `.turbo`, `.swc` | `next build` |
| **Vite** | `vite` | `dist`, `.vite` | `vite build` |
| **Remix** | `@remix-run/node` / `remix` | `build`, `.cache` | `remix build` |
| **Expo** | `expo` | `.expo` | `expo export` |
| **React Native** | `react-native` | shared caches | `react-native bundle` |
| **Electron** | `electron` | `dist`, `out`, `release` | `electron-builder` |
| **Gatsby** | `gatsby` | `.cache` | `gatsby build` |
| **Astro** | `astro` | `dist`, `.astro` | `astro build` |
| **CRA** | `react-scripts` | `build` | `react-scripts build` |
| **Generic React** | `react` (no framework) | `dist` | `npm run build` |

Any project with `react` or a framework dependency works. Use `--force` to run outside a detected React project.

---

### 10 Commands Overview

| Command | Purpose |
|---------|---------|
| **Interactive** | `npx nextcool` — TUI menu to pick what to run |
| **PREP** | `npx nextcool prep` — Auto-fix + verify code (before commit) |
| **COOL** | `npx nextcool cool` — Full pipeline: kill → clean → rebuild |
| **FULLCLEAN** | `npx nextcool fullclean` — Deep reset + lint + format |
| **CI** | `npx nextcool ci` — Quality gate + build report |
| **CLEAN** | `npx nextcool clean` — Delete framework caches (`.next`, `dist`, `.vite`, …) |
| **KILL** | `npx nextcool kill` — Kill zombie node processes |
| **PURGE** | `npx nextcool purge` — Clear PM cache (bun/pnpm/npm/yarn) |
| **DOCTOR** | `npx nextcool doctor` — Check RAM, disk, zombies, detected framework |
| **ACTION-RUNNER** | `npx nextcool action-runner` — GitHub Actions workflow setup |

---

### 📌 Most Used: PREP

```bash
npx nextcool prep --yes
```

**What it does:**
- **Phase 1** (fixes): `eslint --fix` → `prettier --write`
- **Phase 2** (checks): `eslint --strict` + `prettier --check` + `tsc --noEmit` (parallel)

Perfect before every commit — works on any React/TypeScript project.

---

### 🔧 Global Options

```bash
--yes              # Skip confirmations
--dry-run          # Show what would happen
--full             # Also delete node_modules
--webpack          # Next.js only: use --no-turbo (Turbopack workaround)
--memory 4096      # Cap Node at 4 GB
--cwd ./path       # Target directory
--force            # Run even outside a React project
--dev              # Boot dev server after pipeline (framework-aware)
--prod             # Boot production server after pipeline (framework-aware)
```

**Dev/prod server examples by framework:**

| Framework | `--dev` | `--prod` |
|-----------|---------|----------|
| Next.js | `next dev` | `next start` |
| Vite | `vite` | `vite preview` |
| Expo | `expo start` | `expo start --no-dev` |
| Remix | `remix dev` | `remix-serve build` |
| CRA | `react-scripts start` | uses `start` script |

Uses `package.json` scripts when present (`dev`, `start`, `preview`).

---

### 💡 Real-World Workflows

#### Before Every Commit
```bash
npx nextcool prep --yes
```

#### Dev Server Stuck (any React stack)
```bash
npx nextcool cool --yes
```

#### Fresh Start (Keep Dev Running)
```bash
npx nextcool cool --dev
```

#### Deep Reset (Nuclear Option)
```bash
npx nextcool fullclean --yes
```

#### GitHub Actions
```yaml
steps:
  - run: bun x nextcool prep --ci
  - run: bun x nextcool ci --report --fail-on-growth 5
```

#### Build Report (framework-aware)

`nextcool ci --report` measures build output size after the detected framework's build:

- **Next.js** — `.next` and `.next/static` (client bundle)
- **Vite / Remix / Astro / Electron** — `dist` and `dist/assets`
- **Other** — primary output dir for that stack

Reports are JSON (`nextcool-report.json`, v2). v1 Next.js-only reports still work as baselines.

---

### 🪟 Platform Support

macOS ✅ · Linux ✅ · Windows ✅ · WSL ✅

**Windows Note:** Use `npx nextcool` in scripts, not bare `nextcool`.

---

### 🤝 Contributing

```bash
git clone https://github.com/mozaddedalfeshani/nextcool
cd nextcool
bun install && bun run dev
```

---

### 📄 License

MIT © [mozaddedalfeshani](https://github.com/mozaddedalfeshani)

---

## বাংলা

### 🎯 কেন nextcool?

**সমস্যা:**
- Dev সার্ভার ক্র্যাশ করে → হাতে হাতে প্রসেস কিল করতে হয়
- ক্যাশ corrupt → `.next`, `dist`, `.vite`, `.turbo` ইত্যাদি ম্যানুয়ালি মুছতে হয়
- Dependency conflict → বারবার install করতে হয়
- Code quality check → push এর আগে ধীর lint/typecheck
- Bundle size বাড়ে → CI fail না হওয়া পর্যন্ত বোঝা যায় না
- ল্যাপটপ গরম → dev server (Next.js, Vite, Metro, Expo…) অতিরিক্ত CPU নেয়

**nextcool এই সব এক কমান্ডে সমাধান দেয় — শুধু Next.js নয়, যেকোনো React প্রজেক্টে।**

```bash
# আগে: অনেকগুলো ম্যানুয়াল ধাপ
npm run lint && npm run format && npx tsc --noEmit
rm -rf .next dist .vite node_modules/.cache
npm install && npm run build

# এখন: এক কমান্ড
npx nextcool prep
```

---

### 🧩 সাপোর্টেড ফ্রেমওয়ার্ক

| Framework | চেনার উপায় | ক্লিন টার্গেট (উদাহরণ) |
|-----------|--------------|------------------------|
| **Next.js** | `next` | `.next`, `.turbo` |
| **Vite** | `vite` | `dist`, `.vite` |
| **Remix** | `remix` / `@remix-run/node` | `build`, `.cache` |
| **Expo** | `expo` | `.expo` |
| **React Native** | `react-native` | shared caches |
| **Electron** | `electron` | `dist`, `out`, `release` |
| **Gatsby** | `gatsby` | `.cache` |
| **Astro** | `astro` | `dist`, `.astro` |
| **CRA** | `react-scripts` | `build` |
| **Generic React** | `react` | `dist` |

`package.json`-এ `react` বা উপরের যেকোনো dependency থাকলেই চলবে। `--force` দিয়ে override করা যায়।

---

### 📖 ইনস্টলেশন ও সেটআপ

```bash
# ইনস্টল ছাড়াই npx দিয়ে
npx nextcool

# গ্লোবাল ইনস্টল
bun add -g nextcool
pnpm add -g nextcool

# package.json scripts
{
  "scripts": {
    "prep": "npx nextcool prep",
    "cool": "npx nextcool cool",
    "ci": "npx nextcool ci --report"
  }
}
```

**💡 Windows:** স্ক্রিপ্টে সবসময় `npx nextcool` ব্যবহার করুন।

---

### 🔥 ১০টি কমান্ড এক নজরে

| কমান্ড | কী করে |
|--------|--------|
| **Interactive** | `npx nextcool` — TUI মেনু |
| **PREP** | `npx nextcool prep` — কমিটের আগে auto-fix + verify |
| **COOL** | `npx nextcool cool` — kill → clean → reinstall → build |
| **FULLCLEAN** | `npx nextcool fullclean` — deep reset + lint + format |
| **CI** | `npx nextcool ci` — quality gate + build report |
| **CLEAN** | `npx nextcool clean` — ফ্রেমওয়ার্ক অনুযায়ী cache/output মুছে |
| **KILL** | `npx nextcool kill` — zombie node প্রসেস বন্ধ |
| **PURGE** | `npx nextcool purge` — PM cache পরিষ্কার |
| **DOCTOR** | `npx nextcool doctor` — RAM, disk, framework, zombies |
| **ACTION-RUNNER** | `npx nextcool action-runner` — GitHub Actions সেটআপ |

---

#### ১) **PREP** — প্রতিটি কমিটের আগে ⭐

```bash
npx nextcool prep --yes
npx nextcool prep --ci         # CI মোড
npx nextcool prep --dry-run
```

---

#### ২) **COOL** — সম্পূর্ণ পাইপলাইন

```bash
npx nextcool cool --yes
npx nextcool cool --full       # node_modules সহ
npx nextcool cool --dev        # শেষে dev server (framework অনুযায়ী)
npx nextcool cool --prod       # শেষে prod server
npx nextcool cool --webpack    # শুধু Next.js: Turbopack বন্ধ
```

---

#### ৩) **FULLCLEAN** — nuclear reset

```bash
npx nextcool fullclean --yes
```

---

#### ৪) **CI** — quality gate + bundle report

```bash
npx nextcool ci --report
npx nextcool ci --baseline report.json --fail-on-growth 5
```

Build report ফ্রেমওয়ার্ক অনুযায়ী output measure করে (Next.js → `.next`, Vite → `dist`, ইত্যাদি)।

---

#### ৫–১০) **CLEAN**, **KILL**, **PURGE**, **DOCTOR**, **ACTION-RUNNER**, **Interactive**

সরাসরি cache/output, zombie process, PM cache, diagnostics, বা TUI মেনু — প্রয়োজন অনুযায়ী।

---

### ⚙️ গ্লোবাল অপশন

```bash
--yes              # confirmation skip
--dry-run          # trial only
--full             # node_modules সহ clean
--webpack          # Next.js only: --no-turbo
--memory <mb>      # Node memory cap
--cwd <path>       # target project
--force            # React project check skip
--dev / --prod     # pipeline শেষে server (framework-aware)
```

---

### 🚀 অ্যাডভান্সড

- **CPU-limited server:** `npx nextcool cool --dev` — core affinity দিয়ে dev server চালায়
- **Bundle tracking:** `npx nextcool ci --report` — PR-এ size regression ধরতে

---

### 🪟 প্ল্যাটফর্ম

macOS ✅ · Linux ✅ · Windows ✅ · WSL ✅

---

### 📄 লাইসেন্স

MIT © [mozaddedalfeshani](https://github.com/mozaddedalfeshani)
