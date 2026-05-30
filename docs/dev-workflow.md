# Dev Workflow

## Requirements

- macOS (arm64, Apple Silicon)
- Node.js 24+
- npm 10+

## Install

```bash
npm install
```

After install, manually patch the GramJS `tl` package to fix ESM directory imports on Node 24:

```bash
echo '{"main":"index.js"}' > node_modules/telegram/tl/package.json
```

This is required because Node.js 24 rejects bare directory imports under ESM resolver.

## Build & Run

```bash
npm run launch
```

This runs three steps in sequence:

1. **`npm run build`** — `electron-vite build` — compiles main, preload, renderer into `out/`
2. **`npm run pack`** — `electron-builder --dir` — packages into `dist/mac-arm64/Telegram Hygiene.app`
   - Runs `scripts/after-pack.js` which disables two Electron fuses (see below)
3. **`node scripts/sign-and-launch.js`** — ad-hoc code-signs the `.app` with entitlements, then `open`s it

Total time: ~30 seconds.

> **Do NOT use `npm run dev` or invoke the Electron binary directly.**
> On macOS 26.5 (Darwin 25.5.0), direct CLI invocation launches Electron in `node_init` mode
> where `process.type` is undefined and `require('electron')` returns a path string instead
> of the Electron API. The app must run as a `.app` bundle opened via the `open` command.

## Available npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | HMR dev mode — **broken on macOS 26.5**, do not use |
| `npm run build` | Compile all processes via electron-vite |
| `npm run pack` | Package into `.app` bundle (no DMG) |
| `npm run typecheck` | `tsc --noEmit` — type check without building |
| `npm run launch` | Full build → pack → sign → run cycle |

## macOS 26.5 Compatibility Notes

macOS 26.5 (Darwin 25.5.0) introduced stricter Gatekeeper and security policies that
break the standard Electron development workflow. The following workarounds are in place:

### 1. Gatekeeper — disable for development

```bash
sudo spctl --master-disable
```

Required once. Allows unsigned/ad-hoc signed apps to run.

### 2. Entitlements (`scripts/entitlements.plist`)

```xml
com.apple.security.get-task-allow              → allow debugger attach
com.apple.security.cs.allow-jit               → allow JIT (V8)
com.apple.security.cs.allow-unsigned-executable-memory
com.apple.security.cs.disable-library-validation
```

Without `get-task-allow`, Electron exits with `task_name_for_pid: (os/kern) failure (5)`.

### 3. Electron Fuses (`scripts/after-pack.js`)

Disabled fuses:
- `EnableEmbeddedAsarIntegrityValidation` — ad-hoc re-signing invalidates ASAR hash
- `OnlyLoadAppFromAsar` — allows loading unpacked WASM from outside ASAR

### 4. sql.js instead of better-sqlite3

`better-sqlite3` uses native N-API bindings that depend on V8 APIs changed in Electron 42
(`SetNativeDataProperty`, external pointer tags). `sql.js` is a WASM build with no native
compilation, so it works across Electron versions.

The WASM file is unpacked from ASAR via `asarUnpack` in `package.json` and located at
runtime with:

```typescript
join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm')
```

### 5. GramJS `telegram/tl` ESM fix

Node.js 24 enforces ESM spec which forbids bare directory imports (e.g. `import 'telegram/tl'`).
Fixed by:

1. `import { Api } from 'telegram/tl/index.js'` (explicit file)
2. `node_modules/telegram/tl/package.json` with `{"main":"index.js"}`

## TypeScript Path Aliases

| Alias | Resolves to |
|-------|-------------|
| `@shared/*` | `src/shared/*` |
| `@renderer/*` | `src/renderer/src/*` |

Configured in `electron.vite.config.ts` and `tsconfig.*.json`.

## Data Location

```
~/Library/Application Support/telegram-hygiene/telegram-hygiene.db
```

Delete this file to reset all accounts and data.
