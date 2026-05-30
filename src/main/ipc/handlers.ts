import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-channels'
import { BulkActionProgress } from '@shared/types'
import {
  accountQueries,
  entityQueries,
  activityQueries,
  transferQueries
} from '../db'
import {
  startPhoneAuth,
  verifyCode,
  verifyPassword,
  syncAccount,
  leaveEntity,
  bulkLeave,
  transferEntities,
  disconnectClient,
  getOrCreateClient
} from '../telegram/client'

export function registerIpcHandlers(): void {
  // ── Accounts ────────────────────────────────────────────────

  ipcMain.handle(IPC.ACCOUNTS_LIST, () => accountQueries.list())

  ipcMain.handle(IPC.ACCOUNTS_ADD_PHONE, async (_e, phone: string) => {
    await startPhoneAuth(phone)
  })

  ipcMain.handle(IPC.ACCOUNTS_SEND_CODE, async (_e, phone: string) => {
    await startPhoneAuth(phone)
  })

  ipcMain.handle(IPC.ACCOUNTS_VERIFY_CODE, async (_e, phone: string, code: string) => {
    return verifyCode(phone, code)
  })

  ipcMain.handle(IPC.ACCOUNTS_VERIFY_PASSWORD, async (_e, phone: string, password: string) => {
    await verifyPassword(phone, password)
  })

  ipcMain.handle(IPC.ACCOUNTS_REMOVE, async (_e, id: number) => {
    await disconnectClient(id)
    accountQueries.delete(id)
  })

  ipcMain.handle(IPC.ACCOUNTS_RECONNECT, async (_e, id: number) => {
    await getOrCreateClient(id)
  })

  // ── Entities ─────────────────────────────────────────────────

  ipcMain.handle(IPC.ENTITIES_LIST, (_e, accountId: number) =>
    entityQueries.list(accountId)
  )

  ipcMain.handle(IPC.ENTITIES_SYNC, async (_e, accountId: number) => {
    const win = BrowserWindow.getAllWindows()[0]
    await syncAccount(accountId, win)
  })

  ipcMain.handle(IPC.ENTITIES_UNSUBSCRIBE, async (_e, accountId: number, entityId: number) => {
    await leaveEntity(accountId, entityId)
  })

  ipcMain.handle(
    IPC.ENTITIES_BULK_UNSUBSCRIBE,
    async (_e, accountId: number, entityIds: number[]) => {
      const win = BrowserWindow.getAllWindows()[0]
      let done = 0

      const sendProgress = (d: number): void => {
        const progress: BulkActionProgress = {
          total: entityIds.length,
          done: d,
          failed: 0,
          status: d === entityIds.length ? 'done' : 'running'
        }
        win?.webContents.send(IPC.EVENT_BULK_PROGRESS, progress)
      }

      const { failed } = await bulkLeave(accountId, entityIds, (d) => {
        done = d
        sendProgress(done)
      })

      return { failed }
    }
  )

  // ── Analytics ─────────────────────────────────────────────────

  ipcMain.handle(IPC.ANALYTICS_ENTITY, (_e, entityId: number) =>
    activityQueries.get(entityId)
  )

  ipcMain.handle(IPC.ANALYTICS_ACCOUNT_SUMMARY, (_e, accountId: number) =>
    activityQueries.accountSummary(accountId)
  )

  // ── Transfer ─────────────────────────────────────────────────

  ipcMain.handle(IPC.TRANSFER_LIST, () => transferQueries.list())

  ipcMain.handle(
    IPC.TRANSFER_START,
    async (_e, sourceAccountId: number, targetAccountId: number, entityIds: number[]) => {
      const result = transferQueries.create(sourceAccountId, targetAccountId, entityIds)
      const jobId = (result as any).lastInsertRowid as number

      const win = BrowserWindow.getAllWindows()[0]
      transferQueries.updateProgress(jobId, 0, 'running')

      transferEntities(sourceAccountId, targetAccountId, entityIds, jobId, (done) => {
        transferQueries.updateProgress(jobId, done, done === entityIds.length ? 'done' : 'running')
        win?.webContents.send(IPC.EVENT_TRANSFER_PROGRESS, {
          jobId,
          done,
          total: entityIds.length,
          status: done === entityIds.length ? 'done' : 'running'
        })
      })
        .then(() => transferQueries.finish(jobId, 'done'))
        .catch((err) => transferQueries.finish(jobId, 'error', String(err)))

      return jobId
    }
  )
}
