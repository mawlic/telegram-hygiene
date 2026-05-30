# Architecture

## Overview

Telegram Hygiene is a macOS desktop application built on **Electron 42** with a standard
main/renderer/preload three-process model.

```
┌─────────────────────────────────────────────────────┐
│  Renderer Process (React 18 + Zustand + Tailwind)    │
│  src/renderer/src/                                   │
│    ├── store/app.ts          ← Zustand global state  │
│    ├── hooks/useApi.ts       ← IPC bridge calls      │
│    └── components/           ← React UI              │
└──────────────────┬──────────────────────────────────┘
                   │ contextBridge (window.api)
┌──────────────────▼──────────────────────────────────┐
│  Preload Script                                      │
│  src/preload/index.ts  ← exposes typed IPC surface  │
└──────────────────┬──────────────────────────────────┘
                   │ ipcRenderer ↔ ipcMain
┌──────────────────▼──────────────────────────────────┐
│  Main Process (Node.js 24 / Electron 42)             │
│  src/main/                                           │
│    ├── index.ts             ← app bootstrap          │
│    ├── db.ts                ← sql.js SQLite          │
│    ├── ipc/handlers.ts      ← ipcMain.handle()       │
│    └── telegram/client.ts   ← GramJS MTProto         │
└─────────────────────────────────────────────────────┘
```

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| SQLite adapter | sql.js (WASM) | better-sqlite3 V8 API incompatible with Electron 42 |
| Telegram client | GramJS (`telegram` npm) | MTProto, supports StringSession |
| State management | Zustand | lightweight, no boilerplate |
| UI primitives | Radix UI + Tailwind | accessible, unstyled base |
| Build tool | electron-vite | fast HMR + Electron-specific config |

## Data Flow

1. Renderer calls `window.api.<method>(args)` (defined in preload).
2. Preload forwards via `ipcRenderer.invoke(channel, args)`.
3. Main process handler in `handlers.ts` executes DB query or Telegram call.
4. Long-running operations push progress events via `webContents.send(channel, data)`.
5. Renderer listens for events with `window.api.on<Event>(cb)` cleanup hooks.

## Process Isolation

- Renderer has `contextIsolation: true`, `nodeIntegration: false`.
- All Node/Electron APIs are accessed exclusively in main or preload.
- Preload exposes only the minimal typed surface defined in `IPC` constants.

## File Layout

```
src/
  main/
    index.ts              app entry, window creation
    db.ts                 database init + all query namespaces
    ipc/
      handlers.ts         all ipcMain.handle registrations
    telegram/
      client.ts           client lifecycle, auth, sync, leave, transfer
  preload/
    index.ts              contextBridge API surface
  renderer/src/
    App.tsx               root component
    store/app.ts          Zustand store
    hooks/useApi.ts       data loading + event wiring
    components/
      accounts/           AccountsSidebar, AddAccountDialog
      channels/           ChannelsList, ChannelRow
      analytics/          AnalyticsPanel
      transfer/           TransferDialog
      ui/                 shadcn/ui primitives
  shared/
    types.ts              shared TypeScript interfaces
    ipc-channels.ts       IPC channel name constants
scripts/
  after-pack.js           electron-fuses post-pack hook
  sign-and-launch.js      codesign + open
  entitlements.plist      macOS entitlements
```
