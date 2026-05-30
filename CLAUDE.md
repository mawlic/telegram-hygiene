# Claude Code Rules

## Documentation-First Policy

**Before changing any code, update the relevant documentation file(s) first.**

- Adding a feature → update `docs/features.md` and the relevant spec file
- Changing IPC channels → update `docs/ipc-api.md`
- Changing DB schema → update `docs/database.md`
- Changing architecture → update `docs/architecture.md`
- Changing auth/sync/leave/transfer → update `docs/telegram-api.md`
- Changing UI components → update `docs/ui-components.md`
- Changing build/deploy → update `docs/dev-workflow.md`

This ensures docs stay in sync with the code and the user can review intent before implementation.

## Build & Run

```bash
npm run launch   # build → pack → sign → open (~30s)
```

Do NOT use `npm run dev` or invoke the Electron binary directly — macOS 26.5 requires the
packaged `.app` launched via `open`. See [docs/dev-workflow.md](docs/dev-workflow.md).
