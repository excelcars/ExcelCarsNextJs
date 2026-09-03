import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui'

export interface LogFollowupHistoryItem {
  pkFollowupId: number
  createdDt?: Date | string | null
  followupDate: Date | string | null
  contactOutcome?: string | null
  followupStatus: string | null
  followupSubStatus: string | null
  followupClassification: string | null
  comments: string | null
}

export function LogFollowupRecentActivity({
  history,
  loading,
  error,
  daysLate,
  scheduledFollowupDate,
  onViewFullLog,
  formatDate,
  formatOutcome,
  cleanRemark,
}: {
  history: LogFollowupHistoryItem[]
  loading: boolean
  error: string | null
  daysLate: number | null
  scheduledFollowupDate: Date | string | null
  onViewFullLog: () => void
  formatDate: (value: Date | string | null | undefined) => string
  formatOutcome: (value: string | null | undefined) => string
  cleanRemark: (value: string | null | undefined) => string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Recent Activity</div>
        <button type="button" className="text-sm font-medium text-[#1B2A6B]" onClick={onViewFullLog}>
          View full log
        </button>
      </div>
      {loading ? (
        <div className="mt-4 flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-gray-100 bg-gray-50 text-xs text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <div>Loading follow-up history...</div>
        </div>
      ) : error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      ) : (
        <div className="mt-4 space-y-3">
          {daysLate !== null && daysLate > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {daysLate} day{daysLate === 1 ? '' : 's'} with nothing logged. Last scheduled follow-up was {formatDate(scheduledFollowupDate)}.
            </div>
          ) : null}
          {history.length === 0 ? (
            <div className="text-sm text-gray-500">No prior follow-ups logged.</div>
          ) : (
            <div className="space-y-2">
              {history.map(item => (
                <div key={item.pkFollowupId} className="grid gap-2 rounded-lg border border-gray-200 px-3 py-3 md:grid-cols-[140px_1fr]">
                  <div className="text-sm text-gray-500">{formatDate(item.createdDt ?? item.followupDate)}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{formatOutcome(item.contactOutcome)}</span>
                      {item.followupStatus ? <Badge label={item.followupStatus} /> : null}
                      {item.followupSubStatus ? <span className="text-sm font-medium text-[#1B2A6B]">{item.followupSubStatus}</span> : null}
                      {item.followupClassification ? <span className="text-sm text-gray-500">{item.followupClassification}</span> : null}
                    </div>
                    <div className="mt-1 text-sm text-gray-700">{cleanRemark(item.comments) || 'No remark recorded.'}</div>
                    {item.followupDate ? <div className="mt-1 text-xs text-gray-500">Next follow-up set for {formatDate(item.followupDate)}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
