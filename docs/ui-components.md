# UI Components

## Component Tree

```
App
├── AccountsSidebar
│   ├── AccountRow (per account)
│   └── AddAccountDialog
│       └── (phone → code → password → done steps)
└── ChannelsList
    ├── SearchBar + TypeFilter + SortSelect
    ├── SyncButton + SyncProgressBar
    ├── BulkActionBar (shown when selection > 0)
    │   ├── TransferDialog
    │   └── BulkLeaveButton
    └── ChannelRow (per entity)
        └── AnalyticsPanel (expanded on click)
```

## State (Zustand — `src/renderer/src/store/app.ts`)

| Key | Type | Description |
|-----|------|-------------|
| `accounts` | `Account[]` | all authenticated accounts |
| `selectedAccountId` | `number \| null` | active account in sidebar |
| `entities` | `EntityWithActivity[]` | raw entity list for selected account |
| `selectedEntityIds` | `Set<number>` | checked rows for bulk actions |
| `search` | `string` | search bar value |
| `typeFilter` | `string` | `all` \| `channel` \| `supergroup` \| `group` \| `bot` |
| `sortBy` | `string` | `lastRead` \| `title` \| `members` \| `unread` |
| `syncProgress` | `SyncProgress \| null` | live sync state |
| `bulkProgress` | `BulkActionProgress \| null` | live bulk leave state |

### `useFilteredEntities()`

Derived selector (runs in renderer, no IPC):

1. Filter by `is_subscribed = 1`
2. Filter by `typeFilter` (if not `all`)
3. Filter by `search` (case-insensitive title/username match)
4. Sort by `sortBy`

## Key Components

### AccountsSidebar

- Lists all accounts with status indicator:
  - `active` → green Wifi icon
  - `disconnected` → grey WifiOff icon
  - `connecting` → spinning Loader2
  - `error` → red AlertCircle
- Clicking an account sets `selectedAccountId` and triggers `loadEntities()`.
- "Add Account" button opens `AddAccountDialog`.

### AddAccountDialog

Multi-step modal driven by `EVENT_AUTH_STEP` events:

1. **phone** — input + submit → `startPhoneAuth()`
2. **code** — 5-digit input → `verifyCode()`
3. **password** — password input → `verifyPassword()` (only if 2FA enabled)
4. **done** — confirmation, closes dialog, refreshes account list

### ChannelsList

- Search, type filter, and sort controls update Zustand store (no re-fetch).
- Sync button calls `syncAccount()` and shows live `SyncProgress` bar.
- Bulk action bar appears when `selectedEntityIds.size > 0`.
  - Transfer opens `TransferDialog`.
  - Leave triggers `bulkLeave()` with live progress.

### ChannelRow

- Checkbox toggles `selectedEntityIds`.
- Shows: type icon, title, username, member count, last read date, unread badge.
- Click anywhere (except checkbox) expands `AnalyticsPanel`.
- Delete button requires second click within 3 seconds to confirm (two-click safety).

### AnalyticsPanel

Displayed inline below the row when selected. Shows:

- Last read date (formatted relative: "2 days ago", "Never")
- Activity level badge: **High** / **Medium** / **Low** / **Inactive**
  - High: read in last 7 days
  - Medium: read in last 30 days
  - Low: read ever
  - Inactive: never read
- Unread message count
- Smart recommendation text (e.g. "Consider leaving — you haven't read this in over 30 days")

### TransferDialog

- Source account auto-selected (current account).
- Target account dropdown (other authenticated accounts).
- Shows selected entity count.
- Warns that private groups may fail to transfer.
- Progress bar during transfer.
