import { useEffect, useState } from 'react'
import { X, TrendingUp, Clock, MessageSquare, Eye } from 'lucide-react'
import { formatDate } from '../../lib/utils'

interface Activity {
  last_read_date: number | null
  last_message_date: number | null
  read_count: number
  messages_sent: number
  unread_count: number | null
}

export default function AnalyticsPanel({ entityId, onClose }: { entityId: number; onClose: () => void }) {
  const [activity, setActivity] = useState<Activity | null>(null)

  useEffect(() => {
    window.api.getEntityAnalytics(entityId).then(setActivity)
  }, [entityId])

  const daysSinceLastRead = activity?.last_read_date
    ? Math.floor((Date.now() / 1000 - activity.last_read_date) / 86400)
    : null

  const activityLevel = daysSinceLastRead === null
    ? 'unknown'
    : daysSinceLastRead < 1 ? 'high'
    : daysSinceLastRead < 7 ? 'medium'
    : daysSinceLastRead < 30 ? 'low'
    : 'inactive'

  const activityColor = {
    high: 'text-green-400',
    medium: 'text-yellow-400',
    low: 'text-orange-400',
    inactive: 'text-red-400',
    unknown: 'text-zinc-500'
  }[activityLevel]

  const activityLabel = {
    high: 'Active today',
    medium: 'Active this week',
    low: 'Active this month',
    inactive: 'Inactive (30+ days)',
    unknown: 'No data'
  }[activityLevel]

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/80 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          Activity Analytics
        </h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!activity ? (
        <p className="text-xs text-zinc-500">No activity data yet. Sync to collect stats.</p>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Last Read"
            value={formatDate(activity.last_read_date)}
            sub={activity.last_read_date ? `${daysSinceLastRead}d ago` : undefined}
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Activity"
            value={activityLabel}
            valueClass={activityColor}
          />
          <StatCard
            icon={<Eye className="w-4 h-4" />}
            label="Unread"
            value={activity.unread_count != null ? String(activity.unread_count) : '—'}
          />
          <StatCard
            icon={<MessageSquare className="w-4 h-4" />}
            label="Messages Sent"
            value={String(activity.messages_sent)}
            sub="all time"
          />
        </div>
      )}

      {activity && (
        <div className="mt-3 p-3 bg-zinc-800 rounded-lg">
          <p className="text-xs text-zinc-500 mb-1">Recommendation</p>
          <p className="text-xs text-zinc-300">
            {activityLevel === 'inactive'
              ? '⚠️ You haven\'t read this in over 30 days. Consider leaving to reduce noise.'
              : activityLevel === 'low'
              ? '💤 Low activity — review if this channel is still relevant.'
              : activityLevel === 'medium'
              ? '👀 Moderate activity — you check this a few times a week.'
              : '✅ Highly active — you engage with this channel regularly.'}
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon, label, value, sub, valueClass
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  valueClass?: string
}) {
  return (
    <div className="bg-zinc-800 rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
        {icon}
        {label}
      </div>
      <div className={`text-sm font-medium text-white ${valueClass ?? ''}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-600">{sub}</div>}
    </div>
  )
}
