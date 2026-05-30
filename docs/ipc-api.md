# IPC API

All channels are defined as constants in `src/shared/ipc-channels.ts`.
Renderer calls go through `window.api` (exposed by preload via `contextBridge`).

## Invoke Channels (renderer → main, returns Promise)

### Accounts

| Channel | Renderer call | Args | Returns |
|---------|---------------|------|---------|
| `ACCOUNTS_LIST` | `window.api.listAccounts()` | — | `Account[]` |
| `ACCOUNTS_DELETE` | `window.api.deleteAccount(id)` | `id: number` | `void` |
| `ACCOUNTS_DISCONNECT` | `window.api.disconnectAccount(id)` | `id: number` | `void` |

### Auth

| Channel | Renderer call | Args | Returns |
|---------|---------------|------|---------|
| `AUTH_START_PHONE` | `window.api.startPhoneAuth(phone)` | `phone: string` | `void` |
| `AUTH_VERIFY_CODE` | `window.api.verifyCode(phone, code)` | `phone, code: string` | `{ needPassword: boolean }` |
| `AUTH_VERIFY_PASSWORD` | `window.api.verifyPassword(phone, password)` | `phone, password: string` | `void` |

### Entities

| Channel | Renderer call | Args | Returns |
|---------|---------------|------|---------|
| `ENTITIES_LIST` | `window.api.listEntities(accountId)` | `accountId: number` | `EntityWithActivity[]` |
| `ENTITIES_SYNC` | `window.api.syncAccount(accountId)` | `accountId: number` | `void` |
| `ENTITIES_LEAVE` | `window.api.leaveEntity(accountId, entityId)` | both `number` | `void` |
| `ENTITIES_BULK_LEAVE` | `window.api.bulkLeave(accountId, ids)` | `ids: number[]` | `{ failed: number }` |

### Transfer

| Channel | Renderer call | Args | Returns |
|---------|---------------|------|---------|
| `TRANSFER_START` | `window.api.startTransfer(sourceId, targetId, ids)` | `number, number, number[]` | `void` |
| `TRANSFER_LIST` | `window.api.listTransferJobs()` | — | `TransferJob[]` |

## Event Channels (main → renderer, push)

| Channel | Payload type | When emitted |
|---------|-------------|--------------|
| `EVENT_AUTH_STEP` | `AuthStep` | phase changes during auth |
| `EVENT_ACCOUNT_STATUS` | `{ accountId: number, status: string }` | client connect/disconnect |
| `EVENT_SYNC_PROGRESS` | `SyncProgress` | every 50 dialogs + completion |
| `EVENT_BULK_PROGRESS` | `BulkActionProgress` | each entity during bulk leave |

### AuthStep shape

```typescript
type AuthStep =
  | { type: 'code'; phone: string }
  | { type: 'password'; phone: string }
  | { type: 'done'; phone: string }
  | { type: 'error'; phone: string; message: string }
```

### SyncProgress shape

```typescript
interface SyncProgress {
  accountId: number
  current: number
  total: number
  status: 'syncing' | 'done' | 'error'
}
```

### BulkActionProgress shape

```typescript
interface BulkActionProgress {
  accountId: number
  done: number
  total: number
  failed: number
}
```

## Preload Event API

Each event exposed by preload returns a cleanup function:

```typescript
const off = window.api.onSyncProgress((progress) => { ... })
// later:
off()
```
