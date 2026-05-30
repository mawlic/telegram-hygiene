import { useState } from 'react'
import { Trash2, ChevronRight, Hash, Users, Megaphone, Bot, CheckSquare, Square } from 'lucide-react'
import { EntityWithActivity } from '../../../../shared/types'
import { cn, formatDate, formatNumber } from '../../lib/utils'
import { Button } from '../ui/button'

const TypeIcon = {
  channel: Megaphone,
  group: Users,
  supergroup: Users,
  bot: Bot
}

const TypeColor = {
  channel: 'text-blue-400',
  group: 'text-green-400',
  supergroup: 'text-purple-400',
  bot: 'text-yellow-400'
}

interface Props {
  entity: EntityWithActivity
  isSelected: boolean
  isDetailOpen: boolean
  onToggleSelect: () => void
  onOpenDetail: () => void
  onLeave: () => void
}

export default function ChannelRow({ entity, isSelected, isDetailOpen, onToggleSelect, onOpenDetail, onLeave }: Props) {
  const [confirmLeave, setConfirmLeave] = useState(false)
  const Icon = TypeIcon[entity.type] ?? Hash
  const iconColor = TypeColor[entity.type] ?? 'text-zinc-400'
  const activity = entity.activity
  const lastReadDate = (entity as any).last_read_date
  const unreadCount = (entity as any).unread_count

  const handleLeave = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmLeave) {
      onLeave()
    } else {
      setConfirmLeave(true)
      setTimeout(() => setConfirmLeave(false), 2500)
    }
  }

  return (
    <div
      className={cn(
        'flex items-center px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer group transition-colors',
        isDetailOpen && 'bg-zinc-800/60'
      )}
      onClick={onOpenDetail}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
        className="mr-3 text-zinc-500 hover:text-white flex-shrink-0"
      >
        {isSelected
          ? <CheckSquare className="w-4 h-4 text-blue-400" />
          : <Square className="w-4 h-4" />
        }
      </button>

      <div className={cn('mr-3 flex-shrink-0', iconColor)}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{entity.title}</span>
          {entity.username && (
            <span className="text-xs text-zinc-500">@{entity.username}</span>
          )}
        </div>
        <div className="text-xs text-zinc-500 capitalize">{entity.type}</div>
      </div>

      <div className="w-20 text-right text-xs text-zinc-500 flex-shrink-0">
        {formatNumber(entity.membersCount)}
      </div>

      <div className="w-24 text-right text-xs text-zinc-500 flex-shrink-0">
        {formatDate(lastReadDate)}
      </div>

      <div className="w-16 text-right flex-shrink-0">
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px]">
            {unreadCount > 999 ? '999+' : unreadCount}
          </span>
        )}
      </div>

      <div className="w-16 flex justify-end flex-shrink-0 opacity-0 group-hover:opacity-100">
        <button
          onClick={handleLeave}
          className={cn(
            'p-1.5 rounded transition-colors',
            confirmLeave
              ? 'bg-red-500 text-white'
              : 'hover:bg-red-500/20 text-zinc-500 hover:text-red-400'
          )}
          title={confirmLeave ? 'Click again to confirm' : 'Leave'}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <ChevronRight
          className={cn(
            'w-4 h-4 text-zinc-500 transition-transform',
            isDetailOpen && 'rotate-90'
          )}
        />
      </div>
    </div>
  )
}
