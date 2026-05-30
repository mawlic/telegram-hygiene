import { useState } from 'react'
import { Plus, RefreshCw, Trash2, Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react'
import { useAppStore } from '../../store/app'
import { loadAccounts, loadEntities } from '../../hooks/useApi'
import { Account } from '../../../../shared/types'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import AddAccountDialog from './AddAccountDialog'

export default function AccountsSidebar() {
  const { accounts, selectedAccountId, setSelectedAccount } = useAppStore()
  const [showAdd, setShowAdd] = useState(false)

  const handleSelectAccount = async (id: number) => {
    setSelectedAccount(id)
    await loadEntities(id)
  }

  const handleRemove = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    await window.api.removeAccount(id)
    await loadAccounts()
  }

  const handleReconnect = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    await window.api.reconnectAccount(id)
    await loadAccounts()
  }

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Accounts</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {accounts.map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            isSelected={account.id === selectedAccountId}
            onSelect={() => handleSelectAccount(account.id)}
            onRemove={(e) => handleRemove(e, account.id)}
            onReconnect={(e) => handleReconnect(e, account.id)}
          />
        ))}

        {accounts.length === 0 && (
          <p className="text-xs text-zinc-500 text-center py-8 px-2">
            No accounts yet. Add your first Telegram account.
          </p>
        )}
      </div>

      <div className="p-3 border-t border-zinc-800">
        <Button
          variant="outline"
          size="sm"
          className="w-full border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="w-4 h-4" />
          Add Account
        </Button>
      </div>

      {showAdd && <AddAccountDialog onClose={() => { setShowAdd(false); loadAccounts() }} />}
    </div>
  )
}

function AccountRow({
  account,
  isSelected,
  onSelect,
  onRemove,
  onReconnect
}: {
  account: Account
  isSelected: boolean
  onSelect: () => void
  onRemove: (e: React.MouseEvent) => void
  onReconnect: (e: React.MouseEvent) => void
}) {
  const StatusIcon = {
    active: Wifi,
    connecting: Loader2,
    auth_required: AlertCircle,
    error: AlertCircle,
    disconnected: WifiOff
  }[account.status] ?? WifiOff

  const statusColor = {
    active: 'text-green-400',
    connecting: 'text-yellow-400 animate-spin',
    auth_required: 'text-orange-400',
    error: 'text-red-400',
    disconnected: 'text-zinc-500'
  }[account.status] ?? 'text-zinc-500'

  return (
    <div
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer group transition-colors',
        isSelected ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800 text-zinc-300'
      )}
    >
      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
        {account.name?.[0]?.toUpperCase() ?? '?'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{account.name || account.phone}</div>
        <div className="text-xs text-zinc-500 truncate">{account.phone}</div>
      </div>

      <StatusIcon className={cn('w-3.5 h-3.5 flex-shrink-0', statusColor)} />

      <div className="hidden group-hover:flex gap-1">
        {account.status === 'disconnected' && (
          <button
            onClick={onReconnect}
            className="p-1 rounded hover:bg-zinc-600 text-zinc-400 hover:text-white"
            title="Reconnect"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400"
          title="Remove"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
