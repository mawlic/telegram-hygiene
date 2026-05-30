import { create } from 'zustand'
import { Account, EntityWithActivity, SyncProgress, BulkActionProgress } from '../../../shared/types'

interface AppState {
  accounts: Account[]
  selectedAccountId: number | null
  entities: EntityWithActivity[]
  selectedEntityIds: Set<number>
  syncProgress: SyncProgress | null
  bulkProgress: BulkActionProgress | null
  isLoadingEntities: boolean
  searchQuery: string
  filterType: 'all' | 'channel' | 'group' | 'supergroup'
  sortBy: 'last_read' | 'title' | 'members' | 'unread'

  setAccounts: (accounts: Account[]) => void
  addAccount: (account: Account) => void
  removeAccount: (id: number) => void
  updateAccountStatus: (id: number, status: string) => void
  setSelectedAccount: (id: number | null) => void

  setEntities: (entities: EntityWithActivity[]) => void
  setLoadingEntities: (v: boolean) => void
  toggleEntitySelection: (id: number) => void
  selectAllEntities: () => void
  clearSelection: () => void

  setSyncProgress: (p: SyncProgress | null) => void
  setBulkProgress: (p: BulkActionProgress | null) => void
  setSearchQuery: (q: string) => void
  setFilterType: (t: AppState['filterType']) => void
  setSortBy: (s: AppState['sortBy']) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  accounts: [],
  selectedAccountId: null,
  entities: [],
  selectedEntityIds: new Set(),
  syncProgress: null,
  bulkProgress: null,
  isLoadingEntities: false,
  searchQuery: '',
  filterType: 'all',
  sortBy: 'last_read',

  setAccounts: (accounts) => set({ accounts }),
  addAccount: (account) => set((s) => ({ accounts: [...s.accounts, account] })),
  removeAccount: (id) =>
    set((s) => ({
      accounts: s.accounts.filter((a) => a.id !== id),
      selectedAccountId: s.selectedAccountId === id ? null : s.selectedAccountId
    })),
  updateAccountStatus: (id, status) =>
    set((s) => ({
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, status: status as any } : a))
    })),
  setSelectedAccount: (id) => set({ selectedAccountId: id, entities: [], selectedEntityIds: new Set() }),

  setEntities: (entities) => set({ entities }),
  setLoadingEntities: (v) => set({ isLoadingEntities: v }),
  toggleEntitySelection: (id) =>
    set((s) => {
      const next = new Set(s.selectedEntityIds)
      next.has(id) ? next.delete(id) : next.add(id)
      return { selectedEntityIds: next }
    }),
  selectAllEntities: () =>
    set((s) => ({ selectedEntityIds: new Set(s.entities.map((e) => e.id)) })),
  clearSelection: () => set({ selectedEntityIds: new Set() }),

  setSyncProgress: (p) => set({ syncProgress: p }),
  setBulkProgress: (p) => set({ bulkProgress: p }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilterType: (t) => set({ filterType: t }),
  setSortBy: (s) => set({ sortBy: s })
}))

export function useFilteredEntities() {
  const { entities, searchQuery, filterType, sortBy } = useAppStore()

  let result = entities.filter((e) => e.is_subscribed === 1)

  if (filterType !== 'all') result = result.filter((e) => e.type === filterType)

  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    result = result.filter(
      (e) => e.title.toLowerCase().includes(q) || e.username?.toLowerCase().includes(q)
    )
  }

  result = [...result].sort((a, b) => {
    if (sortBy === 'last_read') {
      const aDate = (a as any).last_read_date ?? 0
      const bDate = (b as any).last_read_date ?? 0
      return bDate - aDate
    }
    if (sortBy === 'title') return a.title.localeCompare(b.title)
    if (sortBy === 'members') return (b.membersCount ?? 0) - (a.membersCount ?? 0)
    if (sortBy === 'unread') return ((b as any).unread_count ?? 0) - ((a as any).unread_count ?? 0)
    return 0
  })

  return result
}
