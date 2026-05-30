import { useState, useEffect } from 'react'
import { X, ArrowRightLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useAppStore } from '../../store/app'
import { Button } from '../ui/button'

interface TransferProgress {
  jobId: number
  done: number
  total: number
  status: 'running' | 'done' | 'error'
}

export default function TransferDialog({
  sourceAccountId,
  entityIds,
  onClose
}: {
  sourceAccountId: number
  entityIds: number[]
  onClose: () => void
}) {
  const { accounts } = useAppStore()
  const [targetAccountId, setTargetAccountId] = useState<number | null>(null)
  const [progress, setProgress] = useState<TransferProgress | null>(null)
  const [isStarted, setIsStarted] = useState(false)

  const otherAccounts = accounts.filter((a) => a.id !== sourceAccountId)
  const sourceAccount = accounts.find((a) => a.id === sourceAccountId)
  const targetAccount = accounts.find((a) => a.id === targetAccountId)

  useEffect(() => {
    const off = window.api.onTransferProgress((data: TransferProgress) => setProgress(data))
    return off
  }, [])

  const handleStart = async () => {
    if (!targetAccountId) return
    setIsStarted(true)
    await window.api.startTransfer(sourceAccountId, targetAccountId, entityIds)
  }

  const isDone = progress?.status === 'done'
  const isRunning = isStarted && progress?.status === 'running'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-[440px] shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            Transfer Subscriptions
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white" disabled={isRunning}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isStarted ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
              <div className="text-sm">
                <div className="text-zinc-400 text-xs mb-1">From</div>
                <div className="text-white font-medium">{sourceAccount?.name}</div>
                <div className="text-zinc-500 text-xs">{sourceAccount?.phone}</div>
              </div>
              <ArrowRightLeft className="w-5 h-5 text-zinc-500 mx-auto" />
              <div className="flex-1 text-sm">
                <div className="text-zinc-400 text-xs mb-1">To</div>
                {otherAccounts.length === 0 ? (
                  <p className="text-xs text-zinc-500">No other accounts. Add one first.</p>
                ) : (
                  <select
                    value={targetAccountId ?? ''}
                    onChange={(e) => setTargetAccountId(Number(e.target.value))}
                    className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-white text-sm outline-none"
                  >
                    <option value="">Select account…</option>
                    {otherAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.phone})</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300">
              <strong>{entityIds.length} subscriptions</strong> will be transferred.
              Only public channels and groups can be joined automatically.
            </div>

            <Button
              className="w-full"
              onClick={handleStart}
              disabled={!targetAccountId || otherAccounts.length === 0}
            >
              Start Transfer
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {progress && (
              <>
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>{isDone ? 'Transfer complete' : 'Transferring…'}</span>
                  <span>{progress.done} / {progress.total}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${isDone ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
              </>
            )}

            {!progress && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting transfer…
              </div>
            )}

            {isDone && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-5 h-5" />
                All done! {progress.done} subscriptions transferred.
              </div>
            )}

            {isDone && (
              <Button className="w-full" onClick={onClose}>Close</Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
