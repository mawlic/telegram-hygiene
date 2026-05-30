# Features

## Implemented

### Account Management
- Add Telegram account via phone + SMS code (+ 2FA password if enabled)
- Multiple accounts supported simultaneously
- Per-account connection status (active / disconnected / error)
- Remove account (deletes session and all associated data)

### Channel & Chat Sync
- Sync up to 500 dialogs per account from Telegram
- Tracks: channels, supergroups, groups, bots
- Stores: title, username, member count, last message date, unread count
- Live sync progress bar

### Browse & Filter
- Search entities by title or username
- Filter by type: all / channel / supergroup / group / bot
- Sort by: last read date / title / member count / unread count

### Analytics
- Last read date per entity
- Activity level: High (7d) / Medium (30d) / Low (ever) / Inactive (never)
- Unread message count
- Smart leave recommendation text

### Unsubscribe
- Leave individual channel/group with two-click confirmation
- Bulk leave selected entities with live progress and failure count
- Rate-limited to avoid Telegram flood errors (600 ms between leaves)

### Transfer
- Transfer subscriptions from one account to another
- Bulk transfer selected entities
- Rate-limited (800 ms per entity)
- Skips private groups that cannot be auto-joined

## Not Yet Implemented

### Account
- [ ] Avatar display
- [ ] Account reordering

### Analytics
- [ ] True `last_read_date` from Telegram (currently approximated from `readOutboxMaxId`)
- [ ] `messages_sent` counter (schema exists, not populated)
- [ ] `read_count` counter (schema exists, not populated)
- [ ] Charts / timeline view (recharts is installed)
- [ ] Export analytics to CSV

### Entities
- [ ] Direct messages / contacts management
- [ ] Mute/unmute channels (schema `is_muted` exists)
- [ ] Inline join (subscribe to a new channel by username)
- [ ] Bulk re-subscribe

### Transfer
- [ ] Transfer progress persistence across app restarts (job stored in DB but not resumed)
- [ ] Support private group transfer via invite links

### General
- [ ] Auto-sync on startup
- [ ] Notifications for sync completion
- [ ] Dark/light theme toggle (currently always dark)
- [ ] Keyboard shortcuts
