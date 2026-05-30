import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function initDb(): void {
  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) mkdirSync(userDataPath, { recursive: true })

  const dbPath = join(userDataPath, 'telegram-hygiene.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      phone      TEXT    NOT NULL UNIQUE,
      name       TEXT    NOT NULL DEFAULT '',
      username   TEXT,
      avatar     TEXT,
      session    TEXT,
      status     TEXT    NOT NULL DEFAULT 'disconnected',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS entities (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id    INTEGER NOT NULL,
      tg_id         TEXT    NOT NULL,
      type          TEXT    NOT NULL,
      title         TEXT    NOT NULL,
      username      TEXT,
      members_count INTEGER,
      is_subscribed INTEGER NOT NULL DEFAULT 1,
      is_muted      INTEGER NOT NULL DEFAULT 0,
      last_synced   INTEGER,
      UNIQUE(account_id, tg_id),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS entity_activity (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id         INTEGER NOT NULL UNIQUE,
      account_id        INTEGER NOT NULL,
      last_read_date    INTEGER,
      last_message_date INTEGER,
      read_count        INTEGER NOT NULL DEFAULT 0,
      messages_sent     INTEGER NOT NULL DEFAULT 0,
      unread_count      INTEGER,
      updated_at        INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (entity_id)  REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transfer_jobs (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      source_account_id INTEGER NOT NULL,
      target_account_id INTEGER NOT NULL,
      entity_ids        TEXT    NOT NULL,
      status            TEXT    NOT NULL DEFAULT 'pending',
      progress          INTEGER NOT NULL DEFAULT 0,
      total             INTEGER NOT NULL DEFAULT 0,
      error             TEXT,
      created_at        INTEGER NOT NULL DEFAULT (unixepoch()),
      finished_at       INTEGER,
      FOREIGN KEY (source_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (target_account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_entities_account  ON entities(account_id);
    CREATE INDEX IF NOT EXISTS idx_activity_entity   ON entity_activity(entity_id);
    CREATE INDEX IF NOT EXISTS idx_activity_account  ON entity_activity(account_id);
  `)
}

// --- Account queries ---

export const accountQueries = {
  list: () => getDb().prepare('SELECT * FROM accounts ORDER BY created_at ASC').all(),

  get: (id: number) => getDb().prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any,

  upsertSession: (phone: string, session: string, name: string, username: string | null) =>
    getDb()
      .prepare(
        `INSERT INTO accounts (phone, session, name, username, status)
         VALUES (?, ?, ?, ?, 'active')
         ON CONFLICT(phone) DO UPDATE SET session=excluded.session,
           name=excluded.name, username=excluded.username, status='active'`
      )
      .run(phone, session, name, username),

  updateStatus: (id: number, status: string) =>
    getDb().prepare('UPDATE accounts SET status = ? WHERE id = ?').run(status, id),

  delete: (id: number) => getDb().prepare('DELETE FROM accounts WHERE id = ?').run(id)
}

// --- Entity queries ---

export const entityQueries = {
  list: (accountId: number) =>
    getDb()
      .prepare(
        `SELECT e.*, ea.last_read_date, ea.last_message_date, ea.read_count,
                ea.messages_sent, ea.unread_count
         FROM entities e
         LEFT JOIN entity_activity ea ON ea.entity_id = e.id
         WHERE e.account_id = ?
         ORDER BY ea.last_read_date DESC NULLS LAST, e.title ASC`
      )
      .all(accountId),

  upsertMany: (accountId: number, entities: any[]) => {
    const stmt = getDb().prepare(
      `INSERT INTO entities (account_id, tg_id, type, title, username, members_count, is_subscribed, last_synced)
       VALUES (?, ?, ?, ?, ?, ?, 1, unixepoch())
       ON CONFLICT(account_id, tg_id) DO UPDATE SET
         title=excluded.title, username=excluded.username,
         members_count=excluded.members_count, is_subscribed=1, last_synced=excluded.last_synced`
    )
    const insertMany = getDb().transaction((items: any[]) => {
      for (const e of items) stmt.run(accountId, e.tgId, e.type, e.title, e.username, e.membersCount)
    })
    insertMany(entities)
  },

  markUnsubscribed: (accountId: number, tgId: string) =>
    getDb()
      .prepare('UPDATE entities SET is_subscribed = 0 WHERE account_id = ? AND tg_id = ?')
      .run(accountId, tgId),

  markSubscribed: (accountId: number, tgId: string) =>
    getDb()
      .prepare('UPDATE entities SET is_subscribed = 1 WHERE account_id = ? AND tg_id = ?')
      .run(accountId, tgId),

  getById: (id: number) => getDb().prepare('SELECT * FROM entities WHERE id = ?').get(id) as any
}

// --- Activity queries ---

export const activityQueries = {
  upsertMany: (accountId: number, items: any[]) => {
    const stmt = getDb().prepare(
      `INSERT INTO entity_activity (entity_id, account_id, last_read_date, last_message_date, unread_count, updated_at)
       VALUES (?, ?, ?, ?, ?, unixepoch())
       ON CONFLICT(entity_id) DO UPDATE SET
         last_read_date=excluded.last_read_date,
         last_message_date=excluded.last_message_date,
         unread_count=excluded.unread_count,
         updated_at=excluded.updated_at`
    )
    const run = getDb().transaction((rows: any[]) => {
      for (const r of rows) stmt.run(r.entityId, accountId, r.lastReadDate, r.lastMessageDate, r.unreadCount)
    })
    run(items)
  },

  get: (entityId: number) =>
    getDb().prepare('SELECT * FROM entity_activity WHERE entity_id = ?').get(entityId) as any,

  accountSummary: (accountId: number) =>
    getDb()
      .prepare(
        `SELECT
           COUNT(*) as total_entities,
           SUM(CASE WHEN last_read_date IS NOT NULL THEN 1 ELSE 0 END) as read_at_least_once,
           SUM(CASE WHEN last_read_date > unixepoch('now', '-7 days') THEN 1 ELSE 0 END) as active_last_7d,
           SUM(CASE WHEN last_read_date > unixepoch('now', '-30 days') THEN 1 ELSE 0 END) as active_last_30d,
           SUM(unread_count) as total_unread
         FROM entity_activity
         WHERE account_id = ?`
      )
      .get(accountId) as any
}

// --- Transfer job queries ---

export const transferQueries = {
  create: (sourceId: number, targetId: number, entityIds: number[]) =>
    getDb()
      .prepare(
        `INSERT INTO transfer_jobs (source_account_id, target_account_id, entity_ids, total)
         VALUES (?, ?, ?, ?)`
      )
      .run(sourceId, targetId, JSON.stringify(entityIds), entityIds.length),

  updateProgress: (id: number, progress: number, status: string) =>
    getDb()
      .prepare('UPDATE transfer_jobs SET progress = ?, status = ? WHERE id = ?')
      .run(progress, status, id),

  finish: (id: number, status: string, error?: string) =>
    getDb()
      .prepare('UPDATE transfer_jobs SET status = ?, finished_at = unixepoch(), error = ? WHERE id = ?')
      .run(status, error ?? null, id),

  list: () =>
    getDb()
      .prepare('SELECT * FROM transfer_jobs ORDER BY created_at DESC LIMIT 50')
      .all()
}
