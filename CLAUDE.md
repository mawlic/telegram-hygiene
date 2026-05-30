# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
npm run launch   # build → pack → sign → open (~30s)
```

`npm run launch` runs: `electron-vite build` → `electron-builder --dir` → `scripts/sign-and-launch.js` (ad-hoc codesign + `open`).

**Do NOT use `npm run dev` or run the Electron binary directly.** On macOS 26.5 (Darwin 25.5.0), CLI invocation runs Electron in `node_init` mode where `require('electron')` returns a path string, not the API. The app must run as a `.app` bundle via `open`.

Other scripts:
```bash
npm run build      # compile only
npm run typecheck  # tsc --noEmit
```

There are no tests.

## Documentation-First Policy

**Before changing any code, update the relevant documentation file first.**

| Change | Doc to update first |
|--------|---------------------|
| New feature | `docs/features.md` + relevant spec |
| IPC channels | `docs/ipc-api.md` |
| DB schema | `docs/database.md` |
| Architecture | `docs/architecture.md` |
| Auth/sync/leave/transfer | `docs/telegram-api.md` |
| UI components | `docs/ui-components.md` |
| Build/deploy | `docs/dev-workflow.md` |

## Architecture

Electron 42 app with standard three-process model:

```
Renderer (React + Zustand)
  └─ window.api (contextBridge)
      └─ Preload (ipcRenderer.invoke / on)
          └─ Main (ipcMain.handle)
              ├─ db.ts          sql.js WASM SQLite
              └─ telegram/client.ts  GramJS MTProto
```

- `src/shared/ipc-channels.ts` — all IPC channel name constants (use these, never raw strings)
- `src/shared/types.ts` — all TypeScript interfaces shared between processes
- `src/main/ipc/handlers.ts` — single file registering all `ipcMain.handle()` calls
- `src/main/db.ts` — `initDb()` (async, must await before handlers register), `accountQueries`, `entityQueries`, `activityQueries`, `transferQueries`
- `src/main/telegram/client.ts` — client Map keyed by accountId, auth flow, sync (500 dialogs), leave, transfer
- `src/renderer/src/store/app.ts` — Zustand store; `useFilteredEntities()` does client-side filter/sort
- `src/renderer/src/hooks/useApi.ts` — IPC calls + event listener wiring

Renderer has `contextIsolation: true`, `nodeIntegration: false`. All Node/Electron access goes through preload.

## Key Implementation Details

**sql.js** (not better-sqlite3): `better-sqlite3` is incompatible with Electron 42's V8 changes. The WASM file is unpacked from ASAR (`asarUnpack` in package.json) and located at `join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm')`. Every write calls `persist()` which serializes the DB to disk.

**GramJS imports**: Use `import { Api } from 'telegram/tl/index.js'` (explicit `.js` extension). Node.js 24 rejects bare directory imports. `node_modules/telegram/tl/package.json` is manually patched to `{"main":"index.js"}` — do not delete it.

**Electron fuses** (`scripts/after-pack.js`): `EnableEmbeddedAsarIntegrityValidation` and `OnlyLoadAppFromAsar` are disabled post-pack. Ad-hoc re-signing invalidates the ASAR hash, so integrity validation must be off.

**Entitlements** (`scripts/entitlements.plist`): `get-task-allow` is required — without it, macOS 26.5 kills the process with `task_name_for_pid: (os/kern) failure (5)`.

**Rate limits**: `bulkLeave` sleeps 600 ms between leaves; `transferEntities` sleeps 800 ms per join.

## Data

DB file: `~/Library/Application Support/telegram-hygiene/telegram-hygiene.db`

Core tables: `accounts` (session strings), `entities` (channels/groups per account), `entity_activity` (read dates, unread counts), `transfer_jobs`. See `docs/database.md` for full schema.
