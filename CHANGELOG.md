# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2026-05-15

### Added
- ESLint setup with `typescript-eslint` flat config (`eslint.config.js`)

### Fixed
- **Interactive mode** — after Auto/Manual pipeline finishes, app returns to menu instead of exiting (press any key)
- **Doctor** — after diagnostics finish, app waits; ESC returns to menu
- **Doctor error path** — on failure in interactive mode, screen transitions to `doctor-done` so ESC handler stays active (previously stuck on "running diagnostics")
- **Windows menu lag** — `StatsBar` was calling `execSync("powershell …")` every second, blocking the event loop 300–800 ms and swallowing arrow key input; replaced all platform RAM checks with async `child_process.exec`, interval raised to 2 s

## [2.0.3] - 2025-xx-xx

### Fixed
- Windows CPU affinity now targets the full process tree, not only the root `node.exe`

## [2.0.2] - 2025-xx-xx

### Fixed
- Multi-lockfile package manager selector
- Windows server spawn via `cmd.exe`

## [2.0.1] - 2025-xx-xx

### Fixed
- Run Server: CPU core limiting, live logs, ESC to stop

## [2.0.0] - 2025-xx-xx

### Added
- Interactive TUI menu (Auto, Manual, Run Server, Doctor)
- Run Server with CPU core limiting (Linux: `taskset`, macOS: `nice` + `UV_THREADPOOL_SIZE`, Windows: PowerShell affinity)
- Doctor command: RAM, disk, zombie process, Turbopack diagnostics
- Manual step selector
- Multi-lockfile PM selector (`PmSelector`)
- Progress dashboard with live log pane
- `StatsBar` with real-time CPU % (tick delta) and RAM usage
