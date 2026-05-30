import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'

const api = {
  // Accounts
  listAccounts: () => ipcRenderer.invoke(IPC.ACCOUNTS_LIST),
  addPhone: (phone: string) => ipcRenderer.invoke(IPC.ACCOUNTS_ADD_PHONE, phone),
  verifyCode: (phone: string, code: string) => ipcRenderer.invoke(IPC.ACCOUNTS_VERIFY_CODE, phone, code),
  verifyPassword: (phone: string, password: string) => ipcRenderer.invoke(IPC.ACCOUNTS_VERIFY_PASSWORD, phone, password),
  removeAccount: (id: number) => ipcRenderer.invoke(IPC.ACCOUNTS_REMOVE, id),
  reconnectAccount: (id: number) => ipcRenderer.invoke(IPC.ACCOUNTS_RECONNECT, id),

  // Entities
  listEntities: (accountId: number) => ipcRenderer.invoke(IPC.ENTITIES_LIST, accountId),
  syncAccount: (accountId: number) => ipcRenderer.invoke(IPC.ENTITIES_SYNC, accountId),
  unsubscribe: (accountId: number, entityId: number) => ipcRenderer.invoke(IPC.ENTITIES_UNSUBSCRIBE, accountId, entityId),
  bulkUnsubscribe: (accountId: number, entityIds: number[]) => ipcRenderer.invoke(IPC.ENTITIES_BULK_UNSUBSCRIBE, accountId, entityIds),

  // Analytics
  getEntityAnalytics: (entityId: number) => ipcRenderer.invoke(IPC.ANALYTICS_ENTITY, entityId),
  getAccountSummary: (accountId: number) => ipcRenderer.invoke(IPC.ANALYTICS_ACCOUNT_SUMMARY, accountId),

  // Transfer
  startTransfer: (sourceId: number, targetId: number, entityIds: number[]) =>
    ipcRenderer.invoke(IPC.TRANSFER_START, sourceId, targetId, entityIds),
  listTransfers: () => ipcRenderer.invoke(IPC.TRANSFER_LIST),

  // Events
  onSyncProgress: (cb: (data: any) => void) => {
    ipcRenderer.on(IPC.EVENT_SYNC_PROGRESS, (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners(IPC.EVENT_SYNC_PROGRESS)
  },
  onBulkProgress: (cb: (data: any) => void) => {
    ipcRenderer.on(IPC.EVENT_BULK_PROGRESS, (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners(IPC.EVENT_BULK_PROGRESS)
  },
  onTransferProgress: (cb: (data: any) => void) => {
    ipcRenderer.on(IPC.EVENT_TRANSFER_PROGRESS, (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners(IPC.EVENT_TRANSFER_PROGRESS)
  },
  onAuthStep: (cb: (data: any) => void) => {
    ipcRenderer.on(IPC.EVENT_AUTH_STEP, (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners(IPC.EVENT_AUTH_STEP)
  },
  onAccountStatus: (cb: (data: any) => void) => {
    ipcRenderer.on(IPC.EVENT_ACCOUNT_STATUS, (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners(IPC.EVENT_ACCOUNT_STATUS)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type AppApi = typeof api
