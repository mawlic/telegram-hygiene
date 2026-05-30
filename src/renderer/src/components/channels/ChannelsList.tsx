import { useState } from 'react'
import {
  RefreshCw, Search, Trash2, ArrowRightLeft, ChevronDown,
  CheckSquare, Square, Filter, SortAsc, Loader2
} from 'lucide-react'
import { useAppStore, useFilteredEntities } from '../../store/app'
import { loadEntities } from '../../hooks/useApi'
import { Button } from '../ui/button'
import { cn, formatDate, formatNumber } from '../../lib/utils'
import ChannelRow from './ChannelRow'
import TransferDialog from '../transfer/TransferDialog'
import AnalyticsPanel from '../analytics/AnalyticsPanel'

export default function ChannelsList() {
  const {
    selectedAccountId, isLoadingEntities, syncProgress, bulkProgress,
    selectedEntityIds, selectAllEntities, clearSelection,
    searchQuery, setSearchQuery, filterType, setFilterType, sortBy, setSortBy
  } = useAppStore()
  const entities = useFilteredEntities()
  const [showTransfer, setShowTransfer] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null)
  const [isBulkLeaving, setIsBulkLeaving] = useState(false)

  if (!selectedAccountId) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-4">👈</div>
          <p className="text-lg font-medium text-zinc-400">Select an account</p>
          <p className="text-sm">Choose a Telegram account from the sidebar to view its channels and chats.</p>
        </div>
      </div>
    )
  }

  const handleSync = async () => {
    await window.api.syncAccount(selectedAccountId)
    await loadEntities(selectedAccountId)
  }

  const handleBulkLeave = async () => {
    if (selectedEntityIds.size === 0) return
    setIsBulkLeaving(true)
    try {
      await window.api.bulkUnsubscribe(selectedAccountId, Array.from(selectedEntityIds))
      clearSelection()
      await loadEntities(selectedAccountId)
    } finally {
      setIsBulkLeaving(false)
    }
  }

  const allSelected = entities.length > 0 && entities.every((e) => selectedEntityIds.has(e.id))

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Toolbar */}
      <div className="border-b border-zinc-800 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search channels and chats…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={handleSync} disabled={!!syncProgress} title="Sync">
            {syncProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <FilterButton value={filterType} onChange={setFilterType} />
          <SortButton value={sortBy} onChange={setSortBy} />

          {selectedEntityIds.size > 0 && (
            <>
              <div className="flex-1" />
              <span className="text-xs text-zinc-400">{selectedEntityIds.size} selected</span>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700"
                onClick={() => setShowTransfer(true)}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Transfer
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkLeave}
                disabled={isBulkLeaving}
              >
                {isBulkLeaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Leave
              </Button>
            </>
          )}
        </div>

        {syncProgress && syncProgress.status === 'syncing' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Syncing…</span>
              <span>{syncProgress.current} / {syncProgress.total}</span>
            </div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {bulkProgress && bulkProgress.status === 'running' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Leaving…</span>
              <span>{bulkProgress.done} / {bulkProgress.total}</span>
            </div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Header row */}
      <div className="flex items-center px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500">
        <button
          onClick={allSelected ? clearSelection : selectAllEntities}
          className="mr-3 text-zinc-500 hover:text-white"
        >
          {allSelected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
        </button>
        <span className="flex-1">Name</span>
        <span className="w-20 text-right">Members</span>
        <span className="w-24 text-right">Last read</span>
        <span className="w-16 text-right">Unread</span>
        <span className="w-16" />
      </div>

      {/* Entity list */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingEntities ? (
          <div className="flex items-center justify-center h-40 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading…
          </div>
        ) : entities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-500 space-y-2">
            <p>No channels found.</p>
            <Button variant="ghost" size="sm" onClick={handleSync}>
              <RefreshCw className="w-4 h-4" /> Sync now
            </Button>
          </div>
        ) : (
          entities.map((entity) => (
            <ChannelRow
              key={entity.id}
              entity={entity}
              isSelected={selectedEntityIds.has(entity.id)}
              isDetailOpen={selectedEntityId === entity.id}
              onToggleSelect={() => useAppStore.getState().toggleEntitySelection(entity.id)}
              onOpenDetail={() => setSelectedEntityId(selectedEntityId === entity.id ? null : entity.id)}
              onLeave={async () => {
                await window.api.unsubscribe(selectedAccountId, entity.id)
                await loadEntities(selectedAccountId)
              }}
            />
          ))
        )}
      </div>

      {selectedEntityId && (
        <AnalyticsPanel entityId={selectedEntityId} onClose={() => setSelectedEntityId(null)} />
      )}

      {showTransfer && (
        <TransferDialog
          sourceAccountId={selectedAccountId}
          entityIds={Array.from(selectedEntityIds)}
          onClose={() => setShowTransfer(false)}
        />
      )}
    </div>
  )
}

function FilterButton({
  value, onChange
}: {
  value: string
  onChange: (v: any) => void
}) {
  const options = [
    { label: 'All', value: 'all' },
    { label: 'Channels', value: 'channel' },
    { label: 'Groups', value: 'group' },
    { label: 'Supergroups', value: 'supergroup' }
  ]
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 px-2 text-xs bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300 outline-none"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function SortButton({
  value, onChange
}: {
  value: string
  onChange: (v: any) => void
}) {
  const options = [
    { label: 'Last read', value: 'last_read' },
    { label: 'Title', value: 'title' },
    { label: 'Members', value: 'members' },
    { label: 'Unread', value: 'unread' }
  ]
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 px-2 text-xs bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300 outline-none"
    >
      {options.map((o) => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
    </select>
  )
}
