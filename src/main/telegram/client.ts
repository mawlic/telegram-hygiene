import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-channels'
import { AuthStep, SyncProgress } from '@shared/types'
import { accountQueries, entityQueries, activityQueries } from '../db'
import input from 'input'

// Telegram API credentials — users should replace with their own from https://my.telegram.org
const API_ID = parseInt(process.env.TG_API_ID || '26737529')
const API_HASH = process.env.TG_API_HASH || '4890bd19034e89db5a43ed43dca8bd85'

const clients = new Map<number, TelegramClient>()

function getMainWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null
}

function emit(channel: string, data: unknown): void {
  getMainWindow()?.webContents.send(channel, data)
}

export async function getOrCreateClient(accountId: number): Promise<TelegramClient> {
  if (clients.has(accountId)) {
    const existing = clients.get(accountId)!
    if (existing.connected) return existing
  }

  const account = accountQueries.get(accountId)
  if (!account) throw new Error(`Account ${accountId} not found`)

  const session = new StringSession(account.session || '')
  const client = new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 5,
    useWSS: false
  })

  await client.connect()
  clients.set(accountId, client)
  accountQueries.updateStatus(accountId, 'active')
  emit(IPC.EVENT_ACCOUNT_STATUS, { accountId, status: 'active' })

  return client
}

export async function disconnectClient(accountId: number): Promise<void> {
  const client = clients.get(accountId)
  if (client) {
    await client.disconnect()
    clients.delete(accountId)
  }
  accountQueries.updateStatus(accountId, 'disconnected')
}

export async function disconnectAll(): Promise<void> {
  for (const [id] of clients) await disconnectClient(id)
}

// --- Auth flow ---

interface PendingAuth {
  phone: string
  phoneCodeHash: string
  client: TelegramClient
}

const pendingAuths = new Map<string, PendingAuth>()

export async function startPhoneAuth(phone: string): Promise<void> {
  const session = new StringSession('')
  const client = new TelegramClient(session, API_ID, API_HASH, { connectionRetries: 5 })
  await client.connect()

  const result = await client.invoke(
    new (await import('telegram/tl')).Api.auth.SendCode({
      phoneNumber: phone,
      apiId: API_ID,
      apiHash: API_HASH,
      settings: new (await import('telegram/tl')).Api.CodeSettings({})
    })
  )

  pendingAuths.set(phone, { phone, phoneCodeHash: (result as any).phoneCodeHash, client })
  emit(IPC.EVENT_AUTH_STEP, { type: 'code', phone } as AuthStep)
}

export async function verifyCode(phone: string, code: string): Promise<{ needPassword: boolean }> {
  const pending = pendingAuths.get(phone)
  if (!pending) throw new Error('No pending auth for ' + phone)

  try {
    const Api = (await import('telegram/tl')).Api
    const result = await pending.client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash: pending.phoneCodeHash,
        phoneCode: code
      })
    )

    await finalizeAuth(phone, pending.client, result)
    return { needPassword: false }
  } catch (err: any) {
    if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      return { needPassword: true }
    }
    throw err
  }
}

export async function verifyPassword(phone: string, password: string): Promise<void> {
  const pending = pendingAuths.get(phone)
  if (!pending) throw new Error('No pending auth for ' + phone)

  const { checkPassword } = await import('telegram/Password')
  const Api = (await import('telegram/tl')).Api

  const passwordInfo = await pending.client.invoke(new Api.account.GetPassword())
  const passwordCheck = await checkPassword(passwordInfo as any, password)
  const result = await pending.client.invoke(new Api.auth.CheckPassword({ password: passwordCheck }))

  await finalizeAuth(phone, pending.client, result)
}

async function finalizeAuth(phone: string, client: TelegramClient, authResult: any): Promise<void> {
  const session = client.session.save() as unknown as string
  const me = await client.getMe()
  const name = [(me as any).firstName, (me as any).lastName].filter(Boolean).join(' ') || phone
  const username = (me as any).username ?? null

  accountQueries.upsertSession(phone, session, name, username)
  const account = accountQueries.list().find((a: any) => a.phone === phone) as any

  clients.set(account.id, client)
  pendingAuths.delete(phone)

  emit(IPC.EVENT_AUTH_STEP, { type: 'done', phone } as AuthStep)
  emit(IPC.EVENT_ACCOUNT_STATUS, { accountId: account.id, status: 'active' })
}

// --- Sync dialogs ---

export async function syncAccount(accountId: number, win?: BrowserWindow): Promise<void> {
  const client = await getOrCreateClient(accountId)
  const dialogs = await client.getDialogs({ limit: 500 })

  const entities: any[] = []
  const activities: any[] = []

  let synced = 0
  const total = dialogs.length

  for (const dialog of dialogs) {
    const entity = dialog.entity as any
    if (!entity) continue

    const type = getEntityType(entity)
    if (!type) continue

    const tgId = String(entity.id)
    const title = entity.title || entity.firstName || 'Unknown'
    const username = entity.username ?? null
    const membersCount = entity.participantsCount ?? null

    entities.push({ tgId, type, title, username, membersCount })

    const lastMessage = dialog.message as any
    activities.push({
      tgId,
      lastReadDate: dialog.dialog?.readOutboxMaxId
        ? Math.floor(Date.now() / 1000)
        : null,
      lastMessageDate: lastMessage?.date ?? null,
      unreadCount: dialog.unreadCount ?? 0
    })

    synced++
    if (synced % 50 === 0 || synced === total) {
      const progress: SyncProgress = { accountId, current: synced, total, status: 'syncing' }
      ;(win ?? getMainWindow())?.webContents.send(IPC.EVENT_SYNC_PROGRESS, progress)
    }
  }

  entityQueries.upsertMany(accountId, entities)

  // Map tgId → entity DB id for activity
  const dbEntities = entityQueries.list(accountId) as any[]
  const tgIdToDbId = new Map(dbEntities.map((e: any) => [e.tg_id, e.id]))

  const activityRows = activities
    .map((a) => ({ ...a, entityId: tgIdToDbId.get(a.tgId) }))
    .filter((a) => a.entityId != null)

  activityQueries.upsertMany(accountId, activityRows)

  emit(IPC.EVENT_SYNC_PROGRESS, { accountId, current: total, total, status: 'done' } as SyncProgress)
}

function getEntityType(entity: any): string | null {
  const className = entity.className
  if (className === 'Channel') return entity.megagroup ? 'supergroup' : 'channel'
  if (className === 'Chat') return 'group'
  if (className === 'User' && entity.bot) return 'bot'
  return null
}

// --- Subscribe / Unsubscribe ---

export async function joinEntity(accountId: number, username: string): Promise<void> {
  const client = await getOrCreateClient(accountId)
  await client.invoke(
    new (await import('telegram/tl')).Api.channels.JoinChannel({
      channel: username
    })
  )
}

export async function leaveEntity(accountId: number, entityDbId: number): Promise<void> {
  const client = await getOrCreateClient(accountId)
  const entity = entityQueries.getById(entityDbId) as any
  if (!entity) throw new Error('Entity not found')

  const Api = (await import('telegram/tl')).Api
  const tgEntity = await client.getEntity(entity.username || BigInt(entity.tg_id))

  if (entity.type === 'channel' || entity.type === 'supergroup') {
    await client.invoke(new Api.channels.LeaveChannel({ channel: tgEntity }))
  } else if (entity.type === 'group') {
    await client.invoke(
      new Api.messages.DeleteChatUser({ chatId: BigInt(entity.tg_id), userId: 'me' })
    )
  }

  entityQueries.markUnsubscribed(accountId, entity.tg_id)
}

export async function bulkLeave(
  accountId: number,
  entityDbIds: number[],
  onProgress: (done: number) => void
): Promise<{ failed: number }> {
  let failed = 0
  for (let i = 0; i < entityDbIds.length; i++) {
    try {
      await leaveEntity(accountId, entityDbIds[i])
      await sleep(600)
    } catch {
      failed++
    }
    onProgress(i + 1)
  }
  return { failed }
}

// --- Transfer ---

export async function transferEntities(
  sourceAccountId: number,
  targetAccountId: number,
  entityDbIds: number[],
  jobId: number,
  onProgress: (done: number) => void
): Promise<void> {
  const targetClient = await getOrCreateClient(targetAccountId)
  let done = 0

  for (const dbId of entityDbIds) {
    try {
      const entity = entityQueries.getById(dbId) as any
      if (!entity) { done++; onProgress(done); continue }

      const identifier = entity.username ? `@${entity.username}` : entity.tg_id

      const Api = (await import('telegram/tl')).Api
      const tgEntity = await targetClient.getEntity(identifier)

      if (entity.type === 'channel' || entity.type === 'supergroup') {
        await targetClient.invoke(new Api.channels.JoinChannel({ channel: tgEntity }))
      }

      await sleep(800)
    } catch {
      // skip entities that can't be joined (private groups, etc)
    }
    done++
    onProgress(done)
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
