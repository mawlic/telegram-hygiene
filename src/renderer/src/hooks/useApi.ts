import { useEffect } from 'react'
import { useAppStore } from '../store/app'

declare global {
  interface Window {
    api: import('../../../preload/index').AppApi
  }
}

export function useEventListeners() {
  const { updateAccountStatus, setSyncProgress, setBulkProgress } = useAppStore()

  useEffect(() => {
    const offSync = window.api.onSyncProgress((data) => setSyncProgress(data))
    const offBulk = window.api.onBulkProgress((data) => setBulkProgress(data))
    const offStatus = window.api.onAccountStatus((data) =>
      updateAccountStatus(data.accountId, data.status)
    )
    return () => {
      offSync()
      offBulk()
      offStatus()
    }
  }, [])
}

export async function loadAccounts() {
  const accounts = await window.api.listAccounts()
  useAppStore.getState().setAccounts(accounts)
  return accounts
}

export async function loadEntities(accountId: number) {
  const store = useAppStore.getState()
  store.setLoadingEntities(true)
  try {
    const entities = await window.api.listEntities(accountId)
    store.setEntities(entities)
  } finally {
    store.setLoadingEntities(false)
  }
}
