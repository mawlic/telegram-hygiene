import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import initSqlJs, { Database, SqlJsStatic } from 'sql.js'

let db: Database
let SqlJs: SqlJsStatic
let dbPath: string

async function getSqlJs(): Promise<SqlJsStatic> {
  if (SqlJs) return SqlJs
  // Locate the WASM file - it's unpacked from ASAR so we can find it via __dirname
  const wasmPath = join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm')
  SqlJs = await initSqlJs({
    locateFile: () => wasmPath
  })
  return SqlJs
}

export async function initDb(): Promise<void> {
  const SQL = await getSqlJs()
  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) mkdirSync(userDataPath, { recursive: true })

  dbPath = join(userDataPath, 'telegram-hygiene.db')

  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA foreign_keys = ON')
  migrate()
  persist()
}

function persist(): void {
  if (!db || !dbPath) return
  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

function migrate(): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      phone      TEXT    NOT NULL UNIQUE,
      name       TEXT    NOT NULL DEFAULT '',
      username   TEXT,
      avatar     TEXT,
      session    TEXT,
      status     TEXT    NOT NULL DEFAULT 'disconnected',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    )
  `)

  db.run(`
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
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS entity_activity (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id         INTEGER NOT NULL UNIQUE,
      account_id        INTEGER NOT NULL,
      last_read_date    INTEGER,
      last_message_date INTEGER,
      read_count        INTEGER NOT NULL DEFAULT 0,
      messages_sent     INTEGER NOT NULL DEFAULT 0,
      unread_count      INTEGER,
      updated_at        INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      FOREIGN KEY (entity_id)  REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS transfer_jobs (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      source_account_id INTEGER NOT NULL,
      target_account_id INTEGER NOT NULL,
      entity_ids        TEXT    NOT NULL,
      status            TEXT    NOT NULL DEFAULT 'pending',
      progress          INTEGER NOT NULL DEFAULT 0,
      total             INTEGER NOT NULL DEFAULT 0,
      error             TEXT,
      created_at        INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      finished_at       INTEGER,
      FOREIGN KEY (source_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (target_account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `)

  db.run(`CREATE INDEX IF NOT EXISTS idx_entities_account  ON entities(account_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_entity   ON entity_activity(entity_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_activity_account  ON entity_activity(account_id)`)
  persist()
}

// Helper: run a query and return all rows as plain objects
function query<T = Record<string, unknown>>(sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T)
  }
  stmt.free()
  return rows
}

function run(sql: string, params: any[] = []): void {
  db.run(sql, params)
  persist()
}

function getOne<T = Record<string, unknown>>(sql: string, params: any[] = []): T | undefined {
  return query<T>(sql, params)[0]
}

// --- Account queries ---

export const accountQueries = {
  list: () => query('SELECT * FROM accounts ORDER BY created_at ASC'),

  get: (id: number) => getOne('SELECT * FROM accounts WHERE id = ?', [id]),

  upsertSession: (phone: string, session: string, name: string, username: string | null) => {
    run(
      `INSERT INTO accounts (phone, session, name, username, status)
       VALUES (?, ?, ?, ?, 'active')
       ON CONFLICT(phone) DO UPDATE SET session=excluded.session,
         name=excluded.name, username=excluded.username, status='active'`,
      [phone, session, name, username]
    )
  },

  updateStatus: (id: number, status: string) => {
    run('UPDATE accounts SET status = ? WHERE id = ?', [status, id])
  },

  delete: (id: number) => {
    run('DELETE FROM accounts WHERE id = ?', [id])
  }
}

// --- Entity queries ---

export const entityQueries = {
  list: (accountId: number) =>
    query(
      `SELECT e.*, ea.last_read_date, ea.last_message_date, ea.read_count,
              ea.messages_sent, ea.unread_count
       FROM entities e
       LEFT JOIN entity_activity ea ON ea.entity_id = e.id
       WHERE e.account_id = ?
       ORDER BY COALESCE(ea.last_read_date, 0) DESC, e.title ASC`,
      [accountId]
    ),

  upsertMany: (accountId: number, entities: any[]) => {
    for (const e of entities) {
      db.run(
        `INSERT INTO entities (account_id, tg_id, type, title, username, members_count, is_subscribed, last_synced)
         VALUES (?, ?, ?, ?, ?, ?, 1, strftime('%s','now'))
         ON CONFLICT(account_id, tg_id) DO UPDATE SET
           title=excluded.title, username=excluded.username,
           members_count=excluded.members_count, is_subscribed=1, last_synced=excluded.last_synced`,
        [accountId, e.tgId, e.type, e.title, e.username ?? null, e.membersCount ?? null]
      )
    }
    persist()
  },

  markUnsubscribed: (accountId: number, tgId: string) => {
    run('UPDATE entities SET is_subscribed = 0 WHERE account_id = ? AND tg_id = ?', [accountId, tgId])
  },

  markSubscribed: (accountId: number, tgId: string) => {
    run('UPDATE entities SET is_subscribed = 1 WHERE account_id = ? AND tg_id = ?', [accountId, tgId])
  },

  getById: (id: number) => getOne('SELECT * FROM entities WHERE id = ?', [id])
}

// --- Activity queries ---

export const activityQueries = {
  upsertMany: (accountId: number, items: any[]) => {
    for (const r of items) {
      if (!r.entityId) continue
      db.run(
        `INSERT INTO entity_activity (entity_id, account_id, last_read_date, last_message_date, unread_count, updated_at)
         VALUES (?, ?, ?, ?, ?, strftime('%s','now'))
         ON CONFLICT(entity_id) DO UPDATE SET
           last_read_date=excluded.last_read_date,
           last_message_date=excluded.last_message_date,
           unread_count=excluded.unread_count,
           updated_at=excluded.updated_at`,
        [r.entityId, accountId, r.lastReadDate ?? null, r.lastMessageDate ?? null, r.unreadCount ?? null]
      )
    }
    persist()
  },

  get: (entityId: number) =>
    getOne('SELECT * FROM entity_activity WHERE entity_id = ?', [entityId]),

  accountSummary: (accountId: number) =>
    getOne(
      `SELECT
         COUNT(*) as total_entities,
         SUM(CASE WHEN last_read_date IS NOT NULL THEN 1 ELSE 0 END) as read_at_least_once,
         SUM(CASE WHEN last_read_date > strftime('%s','now','-7 days') THEN 1 ELSE 0 END) as active_last_7d,
         SUM(CASE WHEN last_read_date > strftime('%s','now','-30 days') THEN 1 ELSE 0 END) as active_last_30d,
         SUM(unread_count) as total_unread
       FROM entity_activity
       WHERE account_id = ?`,
      [accountId]
    )
}

// --- Transfer job queries ---

export const transferQueries = {
  create: (sourceId: number, targetId: number, entityIds: number[]) => {
    run(
      `INSERT INTO transfer_jobs (source_account_id, target_account_id, entity_ids, total)
       VALUES (?, ?, ?, ?)`,
      [sourceId, targetId, JSON.stringify(entityIds), entityIds.length]
    )
    const row = getOne<{ id: number }>('SELECT last_insert_rowid() as id')
    return { lastInsertRowid: row?.id }
  },

  updateProgress: (id: number, progress: number, status: string) => {
    run('UPDATE transfer_jobs SET progress = ?, status = ? WHERE id = ?', [progress, status, id])
  },

  finish: (id: number, status: string, error?: string) => {
    run(
      `UPDATE transfer_jobs SET status = ?, finished_at = strftime('%s','now'), error = ? WHERE id = ?`,
      [status, error ?? null, id]
    )
  },

  list: () => query('SELECT * FROM transfer_jobs ORDER BY created_at DESC LIMIT 50')
}
