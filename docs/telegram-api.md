# Telegram API

## Credentials

```
API_ID:   26737529
API_HASH: 4890bd19034e89db5a43ed43dca8bd85
```

Register new credentials at https://my.telegram.org if needed.
Override via environment variables `TG_API_ID` and `TG_API_HASH`.

## Client Lifecycle

- One `TelegramClient` (GramJS) per account, stored in `clients: Map<number, TelegramClient>`.
- Client is created and connected on first use via `getOrCreateClient(accountId)`.
- Session is persisted as a `StringSession` string in the `accounts.session` DB column.
- `disconnectAll()` is called on app quit.

## Authentication Flow

```
startPhoneAuth(phone)
  → Api.auth.SendCode
  → emits EVENT_AUTH_STEP { type: 'code', phone }

verifyCode(phone, code)
  → Api.auth.SignIn
  → if SESSION_PASSWORD_NEEDED → return { needPassword: true }
  → else → finalizeAuth()

verifyPassword(phone, password)
  → Api.account.GetPassword + computeCheck()
  → Api.auth.CheckPassword
  → finalizeAuth()

finalizeAuth(phone, client, result)
  → client.getMe() → extract name, username
  → accountQueries.upsertSession(phone, session, name, username)
  → emit EVENT_AUTH_STEP { type: 'done' }
  → emit EVENT_ACCOUNT_STATUS { accountId, status: 'active' }
```

The auth client is stored in `pendingAuths: Map<string, PendingAuth>` keyed by phone and
deleted after finalization.

## Sync

`syncAccount(accountId)`:

1. `client.getDialogs({ limit: 500 })`
2. For each dialog — extract entity (skip Users without bot flag), type, title, username, membersCount.
3. Batch-insert via `entityQueries.upsertMany()`.
4. Resolve DB IDs, batch-insert activity rows via `activityQueries.upsertMany()`.
5. Emits `EVENT_SYNC_PROGRESS` every 50 entities and on completion.

### Entity Type Mapping

| Telegram className | condition | app type |
|--------------------|-----------|----------|
| `Channel` | megagroup = false | `channel` |
| `Channel` | megagroup = true | `supergroup` |
| `Chat` | — | `group` |
| `User` | bot = true | `bot` |
| `User` | bot = false | skipped |

## Leave (Unsubscribe)

`leaveEntity(accountId, entityDbId)`:

- `channel` / `supergroup` → `Api.channels.LeaveChannel`
- `group` → `Api.messages.DeleteChatUser({ chatId, userId: 'me' })`
- Marks entity `is_subscribed = 0` in DB.

`bulkLeave(accountId, entityDbIds, onProgress)`:
- Sequential with 600 ms delay between each leave.
- Returns `{ failed }` count.

## Transfer

`transferEntities(sourceAccountId, targetAccountId, entityDbIds, jobId, onProgress)`:

- Joins target account to each entity via `Api.channels.JoinChannel`.
- Resolves entity by `@username` or numeric `tg_id`.
- Skips private groups (no public join link) — caught silently.
- Rate-limited at 800 ms per entity.
- Does **not** leave the source account.

## Known Limitations

- Private groups without an invite link cannot be auto-joined.
- Direct messages (User type, non-bot) are excluded from sync and operations.
- `last_read_date` approximation: if `readOutboxMaxId` is non-zero we record current time;
  this does not reflect the actual read timestamp.
- `messages_sent` and `read_count` fields are reserved but not populated.
