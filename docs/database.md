# Database

## Engine

**sql.js 1.14** — WebAssembly port of SQLite 3. Runs in the main process.

- DB file: `~/Library/Application Support/telegram-hygiene/telegram-hygiene.db`
- Every write serializes the in-memory DB to disk via `persist()` (`db.export()` → `writeFileSync`).
- WAL mode and foreign keys are enabled on startup.

## Schema

### `accounts`

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | autoincrement |
| phone | TEXT UNIQUE | international format, e.g. `+79001234567` |
| name | TEXT | display name from Telegram |
| username | TEXT | nullable |
| avatar | TEXT | nullable (not populated yet) |
| session | TEXT | GramJS StringSession (encrypted MTProto session) |
| status | TEXT | `active` \| `disconnected` \| `error` |
| created_at | INTEGER | unix timestamp |

### `entities`

Channels, groups, supergroups, and bots that an account is subscribed to.

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| account_id | INTEGER FK→accounts | |
| tg_id | TEXT | Telegram peer ID |
| type | TEXT | `channel` \| `supergroup` \| `group` \| `bot` |
| title | TEXT | display name |
| username | TEXT | nullable, e.g. `durov` |
| members_count | INTEGER | nullable |
| is_subscribed | INTEGER | 1 = active, 0 = left |
| is_muted | INTEGER | reserved, default 0 |
| last_synced | INTEGER | unix timestamp of last sync |
| UNIQUE | (account_id, tg_id) | |

### `entity_activity`

One row per entity, tracks reading and message statistics.

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| entity_id | INTEGER FK→entities UNIQUE | |
| account_id | INTEGER FK→accounts | |
| last_read_date | INTEGER | unix timestamp, nullable |
| last_message_date | INTEGER | unix timestamp of last message in dialog |
| read_count | INTEGER | reserved, default 0 |
| messages_sent | INTEGER | reserved, default 0 |
| unread_count | INTEGER | nullable |
| updated_at | INTEGER | unix timestamp |

### `transfer_jobs`

Async transfer operations between accounts.

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| source_account_id | INTEGER FK→accounts | |
| target_account_id | INTEGER FK→accounts | |
| entity_ids | TEXT | JSON array of entity db IDs |
| status | TEXT | `pending` \| `running` \| `done` \| `failed` |
| progress | INTEGER | completed count |
| total | INTEGER | total entity count |
| error | TEXT | nullable |
| created_at | INTEGER | |
| finished_at | INTEGER | nullable |

## Indexes

```sql
idx_entities_account   ON entities(account_id)
idx_activity_entity    ON entity_activity(entity_id)
idx_activity_account   ON entity_activity(account_id)
```

## Query Namespaces (db.ts)

| Namespace | Methods |
|-----------|---------|
| `accountQueries` | `list`, `get`, `upsertSession`, `updateStatus`, `delete` |
| `entityQueries` | `list`, `upsertMany`, `markUnsubscribed`, `markSubscribed`, `getById` |
| `activityQueries` | `upsertMany`, `get`, `accountSummary` |
| `transferQueries` | `create`, `updateProgress`, `finish`, `list` |
