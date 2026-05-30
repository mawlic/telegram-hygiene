export type AccountStatus = 'active' | 'connecting' | 'auth_required' | 'error' | 'disconnected'

export interface Account {
  id: number
  phone: string
  name: string
  username: string | null
  avatar: string | null
  session: string | null
  status: AccountStatus
  createdAt: number
}

export type EntityType = 'channel' | 'group' | 'supergroup' | 'bot'

export interface TelegramEntity {
  id: number
  accountId: number
  tgId: string
  type: EntityType
  title: string
  username: string | null
  membersCount: number | null
  isSubscribed: number
  isMuted: number
  lastSynced: number | null
}

export interface EntityActivity {
  entityId: number
  accountId: number
  lastReadDate: number | null
  lastMessageDate: number | null
  readCount: number
  messagesSent: number
  unreadCount: number | null
}

export interface EntityWithActivity extends TelegramEntity {
  activity: EntityActivity | null
}

export interface TransferJob {
  id: number
  sourceAccountId: number
  targetAccountId: number
  entityIds: number[]
  status: 'pending' | 'running' | 'done' | 'error'
  progress: number
  total: number
  createdAt: number
  finishedAt: number | null
  error: string | null
}

export interface AuthStep {
  type: 'phone' | 'code' | 'password' | 'done'
  phone?: string
  error?: string
}

export interface SyncProgress {
  accountId: number
  current: number
  total: number
  status: 'syncing' | 'done' | 'error'
}

export interface BulkActionProgress {
  total: number
  done: number
  failed: number
  status: 'running' | 'done' | 'error'
}
