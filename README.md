# Telegram Hygiene

macOS app for managing Telegram channel subscriptions and chat memberships across multiple accounts.

## What it does

- **Multi-account** — manage several Telegram accounts in one place
- **Analytics** — see how often you read each channel/chat, last activity date, unread counts
- **Bulk actions** — leave many channels at once or transfer subscriptions between accounts
- **Local-first** — all data stored locally in SQLite, no cloud sync

## Documentation

| Doc | Description |
|-----|-------------|
| [Architecture](docs/architecture.md) | System design, process model, file layout |
| [Database](docs/database.md) | SQLite schema, tables, query namespaces |
| [Telegram API](docs/telegram-api.md) | Auth flow, sync, leave, transfer operations |
| [IPC API](docs/ipc-api.md) | All IPC channels between renderer and main |
| [UI Components](docs/ui-components.md) | Component tree, Zustand state, component descriptions |
| [Features](docs/features.md) | Implemented features and roadmap |
| [Dev Workflow](docs/dev-workflow.md) | Build, run, macOS 26.5 compatibility notes |

## Quick Start

```bash
npm install
echo '{"main":"index.js"}' > node_modules/telegram/tl/package.json
npm run launch
```

> Requires macOS arm64 with `sudo spctl --master-disable` run once.
> See [Dev Workflow](docs/dev-workflow.md) for details.

## Tech Stack

- **Electron 42** + **electron-vite**
- **React 18** + **TypeScript** + **Zustand**
- **Tailwind CSS** + **Radix UI**
- **sql.js** (WASM SQLite)
- **GramJS** (`telegram` npm) — MTProto client

## Contributing

See [CLAUDE.md](CLAUDE.md) for the documentation-first development rule.
