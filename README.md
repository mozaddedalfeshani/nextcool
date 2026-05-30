# nextcool

> 🔥 **Stop your laptop overheating.** Kill zombie node processes, purge caches, rebuild your Next.js project, fix-and-verify your code before every commit, run dev/prod servers with CPU core limiting, measure bundle size, and run CI quality gates with build reports.

[![npm version](https://img.shields.io/npm/v/nextcool.svg)](https://www.npmjs.com/package/nextcool)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js ≥18.18](https://img.shields.io/badge/node-%3E%3D18.18-brightgreen)](https://nodejs.org)
[![macOS | Linux | Windows](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue)](https://github.com/mozaddedalfeshani/nextcool)

**[English](#english) | [বাংলা](#বাংলা)**

---

## 🚀 Features at a Glance

✅ **One-Click Cleanup** — Kill zombies, wipe caches, reinstall deps, rebuild  
✅ **Pre-Commit Quality** — Auto-fix + verify code in 30 seconds  
✅ **CI Quality Gate** — Full pipeline with real exit codes  
✅ **Bundle Tracking** — Measure, diff, fail on growth  
✅ **CPU Limiting** — Run servers with CPU affinity  
✅ **Smart Diagnostics** — Check RAM, disk, zombies, Turbopack  
✅ **GitHub Actions Ready** — Official Action + CLI  
✅ **Cross-Platform** — macOS, Linux, Windows, WSL  

---

## English

### 🎯 Why nextcool?

**The Problem:**
- Dev server crashes → you kill the process manually
- Cache is corrupted → you manually rm -rf `.next` and `.turbo`
- Dependencies conflict → you manually npm install
- Code quality → you check linting before push (slow!)
- Bundle size grows → you have no idea until CI fails
- Laptop melting → you blame Next.js (it's the dev server hogging CPU)

**nextcool fixes all of this in ONE command.**

---

### 10 Commands Overview

| Command | Purpose |
|---------|---------|
| **Interactive** | `npx nextcool` - TUI menu to pick what to run |
| **PREP** | `npx nextcool prep` - Auto-fix + verify code (before commit) |
| **COOL** | `npx nextcool cool` - Full pipeline: kill → clean → rebuild |
| **FULLCLEAN** | `npx nextcool fullclean` - Deep reset + lint + format |
| **CI** | `npx nextcool ci` - Quality gate + build report |
| **CLEAN** | `npx nextcool clean` - Delete `.next`, `.turbo`, caches |
| **KILL** | `npx nextcool kill` - Kill zombie processes |
| **PURGE** | `npx nextcool purge` - Clear PM cache (bun/pnpm/npm/yarn) |
| **DOCTOR** | `npx nextcool doctor` - Check RAM, disk, zombies, Turbopack |
| **ACTION-RUNNER** | `npx nextcool action-runner` - GitHub Actions workflow setup |

---

### 📌 Most Used: PREP

```bash
npx nextcool prep --yes
```

**What it does:**
- **Phase 1** (fixes): `eslint --fix` → `prettier --write`
- **Phase 2** (checks): `eslint --strict` + `prettier --check` + `tsc --noEmit` (parallel)

Perfect before every commit.

---

### 🔧 Global Options

```bash
--yes              # Skip confirmations
--dry-run          # Show what would happen
--full             # Also delete node_modules
--webpack          # Use --no-turbo
--memory 4096      # Cap Node at 4 GB
--cwd ./path       # Target directory
--dev              # Boot `next dev` after
--prod             # Boot `next start` after
```

---

### 💡 Real-World Workflows

#### Before Every Commit
```bash
npx nextcool prep --yes
```

#### Dev Server Stuck
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

---

### 🪟 Platform Support

macOS ✅ · Linux ✅ · Windows ✅ · WSL ✅

**Windows Note:** Use `npx nextcool` in scripts, not bare `nextcool`.

---

### 🤝 Contributing

```bash
git clone https://github.com/mozaddedalfeshani/nextcool
cd nextcool
pnpm install && pnpm dev
```

---

### 📄 License

MIT © [mozaddedalfeshani](https://github.com/mozaddedalfeshani)

---

## বাংলা

### 🎯 কেন nextcool?

**সমস্যা:**
- Dev সার্ভার ক্র্যাশ করে → হাতে হাতে প্রসেস কিল করতে হয়
- ক্যাশ করাপ্ট → `.next`/`.turbo` ডিলিট করতে হয়
- ডিপেনডেন্সি ভেঙে যায় → বারবার install করতে হয়
- কোড কোয়ালিটি চেক → push এর আগে ধীরগতিতে lint চেক
- বান্ডল সাইজ বাড়ে → CI ফেল না হওয়া পর্যন্ত বোঝা যায় না
- ল্যাপটপ গরম হয় → আসলে dev সার্ভার অতিরিক্ত CPU ব্যবহার করে

**nextcool এই সব সমস্যার এক কমান্ডে সমাধান দেয়।**

```bash
# আগে: অনেকগুলো ম্যানুয়াল ধাপ
npm run lint
npm run format
npm run typecheck
rm -rf .next .turbo node_modules/.cache
npm install
npm run build

# এখন: মাত্র এক কমান্ড
npx nextcool prep
```

---

### 📖 ইনস্টলেশন ও সেটআপ

```bash
# ইনস্টল ছাড়াই npx দিয়ে সরাসরি ব্যবহার করুন
npx nextcool

# অথবা গ্লোবাল ইনস্টল করুন
pnpm add -g nextcool
npm install -g nextcool
bun add -g nextcool

# অথবা package.json scripts-এ যোগ করুন
{
  "scripts": {
    "prep": "npx nextcool prep",
    "cool": "npx nextcool cool",
    "ci": "npx nextcool ci --report"
  }
}
```

**💡 Windows টিপ:** স্ক্রিপ্টে সবসময় `npx nextcool` ব্যবহার করুন, শুধু `nextcool` নয়।

---

### 🔥 ১০টি কমান্ড এক নজরে

| কমান্ড | কী করে |
|--------|--------|
| **Interactive** | `npx nextcool` - ইন্টারঅ্যাক্টিভ TUI মেনু |
| **PREP** | `npx nextcool prep` - অটো-ফিক্স এবং ভেরিফাই (কমিটের আগে) |
| **COOL** | `npx nextcool cool` - সম্পূর্ণ পাইপলাইন: kill → clean → rebuild |
| **FULLCLEAN** | `npx nextcool fullclean` - ডিপ রিসেট + ক্লিনআপ + বিল্ড |
| **CI** | `npx nextcool ci` - কোয়ালিটি গেট এবং বিল্ড রিপোর্ট |
| **CLEAN** | `npx nextcool clean` - টার্গেট ফোল্ডার ও ক্যাশ ডিলিট করা |
| **KILL** | `npx nextcool kill` - জম্বি নোড প্রসেস বন্ধ করা |
| **PURGE** | `npx nextcool purge` - প্যাকেজ ম্যানেজার ক্যাশ পরিষ্কার করা |
| **DOCTOR** | `npx nextcool doctor` - সিস্টেম ও এনভায়রনমেন্ট হেলথ চেক |
| **ACTION-RUNNER** | `npx nextcool action-runner` - GitHub Actions সেটআপ করা |

---

#### ১) **PREP** — প্রতিটি কমিটের আগে ⭐

```bash
npx nextcool prep
```

**কাজ:**
- **পার্ট ১** (অটো-ফিক্স): `eslint --fix` এবং `prettier --write`
- **পার্ট ২** (চেক): `eslint` কড়াকড়ি চেক, `prettier --check` এবং `tsc --noEmit`

**উদাহরণ:**

```bash
npx nextcool prep --yes        # কনফার্মেশন ছাড়াই চালানো
npx nextcool prep --ci         # CI মোডে চালানো
npx nextcool prep --dry-run    # শুধু কী কী হবে তা দেখা
npx nextcool prep --memory 2048 # ২ জিবি মেমরি লিমিট
```

---

#### ২) **COOL** — সম্পূর্ণ পাইপলাইন

```bash
npx nextcool cool
```

**পাইপলাইন:** প্রসেস বন্ধ → ডিরেক্টরি সাফ → ক্যাশ ক্লিয়ার → নতুন করে ইনস্টল → বিল্ড

```bash
npx nextcool cool --yes        # সরাসরি কমান্ড চালানো
npx nextcool cool --full       # node_modules-সহ ডিলিট করা
npx nextcool cool --dev        # শেষে dev সার্ভার চালু করা
npx nextcool cool --prod       # শেষে প্রোডাকশন সার্ভার চালু করা
npx nextcool cool --webpack    # Turbopack ছাড়া বিল্ড করা
npx nextcool cool --memory 4096 # ৪ জিবি মেমরি লিমিট
```

---

#### ৩) **FULLCLEAN** — মোক্ষম রিসেট

```bash
npx nextcool fullclean
```

সব জম্বি প্রসেস বন্ধ করে, `node_modules` মুছে নতুন করে সবকিছু ফ্রেশভাবে শুরু করার জন্য।

```bash
npx nextcool fullclean --yes
npx nextcool fullclean --dev
```

---

#### ৪) **CI** — CI কোয়ালিটি গেট

```bash
npx nextcool ci
```

**পাইপলাইন:** install → typecheck → lint → format:check → build

```bash
npx nextcool ci --report                     # বিল্ড সাইজ রিপোর্ট তৈরি
npx nextcool ci --baseline report.json       # আগের রিপোর্টের সাথে তুলনা
npx nextcool ci --fail-on-growth 5           # সাইজ ৫% এর বেশি বাড়লে ফেল
```

---

#### ৫) **CLEAN**, ৬) **KILL**, ৭) **PURGE**

সরাসরি ও সহজে বিল্ড আর্টিফ্যাক্ট, জম্বি প্রসেস বা প্যাকেজ ম্যানেজার ক্যাশ পরিষ্কার করতে এগুলো ব্যবহার করুন।

---

#### ৮) **DOCTOR**, ৯) **ACTION-RUNNER**, ১০) **ইন্টারঅ্যাক্টিভ মেনু**

সিস্টেম ডায়াগনস্টিক, GitHub Actions সেটআপ বা গ্রাফিক্যাল মেনুর মাধ্যমে কাজ করতে এগুলো ব্যবহার করুন।

---

### ⚙️ গ্লোবাল অপশন (সব কমান্ডে কাজ করে)

```bash
--yes              # সব কনফার্মেশন স্কিপ করা
--dry-run          # কোনো পরিবর্তন ছাড়া শুধু ট্রায়াল দেখা
--full             # node_modules ক্লিনআপ করা
--webpack          # --no-turbo ব্যবহার করে বিল্ড করা
--memory <mb>      # নোড মেমরি সীমা নির্ধারণ (MB)
--cwd <path>       # নির্দিষ্ট প্রজেক্ট ডিরেক্টরিতে কাজ করা
--dev              # পাইপলাইন শেষে dev সার্ভার চালু করা
--prod              # পাইপলাইন শেষে প্রোডাকশন সার্ভার চালু করা
```

---

### 🚀 অ্যাডভান্সড ফিচার

#### CPU-লিমিটেড Dev সার্ভার
ল্যাপটপ অতিরিক্ত গরম হওয়া ঠেকাতে `npx nextcool cool --dev` ব্যবহার করুন। এটি CPU core affinity ব্যবহার করে প্রসেস কন্ট্রোল করে।

#### বান্ডল সাইজ ট্র্যাকিং
CI-তে `npx nextcool ci --report` ব্যবহার করে আপনার অ্যাপের সাইজ ট্র্যাক করুন এবং আগের ভার্সনের সাথে তুলনা করুন।

---

### 🪟 প্ল্যাটফর্ম সাপোর্ট

macOS ✅ · Linux ✅ · Windows ✅ · WSL ✅

**Windows ইউজারদের জন্য:** স্ক্রিপ্টে সবসময় `npx nextcool` ব্যবহার করুন।

---

### 📄 লাইসেন্স

MIT © [mozaddedalfeshani](https://github.com/mozaddedalfeshani)
