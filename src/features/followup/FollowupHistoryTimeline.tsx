import { Btn } from '@/components/ui'

export interface FollowupTimelineEntry {
  pkFollowupId: number
  createdDt?: Date | string | null
  followupDate: Date | string | null
  followupStatus: string | null
  followupSubStatus: string | null
  followupClassification: string | null
  comments: string | null
}

export function FollowupHistoryTimeline({
  inquiryDate,
  scheduledFollowupDate,
  history,
  overdue,
  overdueDays,
  lastContact,
  latestLoggedBeforeDue,
  mobileNumber,
  onCall,
  onLogFollowup,
  onClose,
  formatLongDate,
  formatMonthYear,
  formatDateTime,
  daysBetween,
  cleanRemark,
}: {
  inquiryDate: Date | string | null
  scheduledFollowupDate: Date | string | null
  history: FollowupTimelineEntry[]
  overdue: boolean
  overdueDays: number | null
  lastContact: Date | string | null
  latestLoggedBeforeDue: boolean
  mobileNumber: string
  onCall: () => void
  onLogFollowup: () => void
  onClose: () => void
  formatLongDate: (value: Date | string | null | undefined) => string
  formatMonthYear: (value: Date | string | null | undefined) => string
  formatDateTime: (value: Date | string | null | undefined) => string
  daysBetween: (older: Date | string | null | undefined, newer: Date | string | null | undefined) => number | null
  cleanRemark: (value: string | null | undefined) => string
}) {
  return (
    <>
      <div className="border-t border-gray-100 px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Contact Cadence</div>
          <div className="text-sm text-gray-500">{formatMonthYear(inquiryDate)} → today</div>
        </div>
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-700">Raised {formatLongDate(inquiryDate)}</span>
            {history.slice(0, 5).reverse().map(item => (
              <span key={item.pkFollowupId} className="rounded-full border border-[#1B2A6B]/15 bg-white px-3 py-1 text-[#1B2A6B]">
                {formatLongDate(item.createdDt ?? item.followupDate)} · {item.followupStatus ?? 'Follow-up'}
              </span>
            ))}
            {overdue ? (
              <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-medium text-red-700">
                {overdueDays} days, no contact
              </span>
            ) : scheduledFollowupDate ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                Next follow-up {formatLongDate(scheduledFollowupDate)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Follow-up Log</div>
          <button type="button" className="text-sm font-medium text-[#1B2A6B]" onClick={onLogFollowup}>Add entry</button>
        </div>
        <div className="mt-5 space-y-5">
          {overdue ? (
            <div className="relative pl-10">
              <span className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-red-600 bg-white" />
              <span className="absolute left-[7px] top-6 bottom-[-20px] w-px bg-gray-200" />
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-2xl font-semibold text-red-900">{formatLongDate(scheduledFollowupDate)}</div>
                  <span className="rounded-md bg-white px-2.5 py-1 text-sm text-red-700">{overdueDays} days ago</span>
                </div>
                <div className="mt-3 text-xl font-semibold text-red-900">Scheduled follow-up is pending</div>
                <div className="mt-2 text-sm text-red-700">
                  {latestLoggedBeforeDue && lastContact
                    ? `This date was set earlier and nothing has been logged since ${formatLongDate(lastContact)}.`
                    : 'This inquiry still needs the next follow-up action to be logged.'}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {mobileNumber ? <Btn variant="outline" onClick={onCall}>Call now</Btn> : null}
                  <Btn onClick={onLogFollowup}>Reschedule</Btn>
                </div>
              </div>
            </div>
          ) : null}
          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-5 py-8 text-center text-sm text-gray-500">No follow-up history recorded yet.</div>
          ) : history.map((item, index) => {
            const entryAt = item.createdDt ?? item.followupDate
            const nextItem = history[index + 1]
            const nextDate = nextItem?.createdDt ?? nextItem?.followupDate
            const gapDays = nextDate ? daysBetween(nextDate, entryAt) : null

            return (
              <div key={item.pkFollowupId} className="relative pl-10">
                <span className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#1B2A6B] bg-white" />
                {index < history.length - 1 ? <span className="absolute left-[7px] top-6 bottom-[-20px] w-px bg-gray-200" /> : null}
                <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-2xl font-semibold text-gray-900">{formatLongDate(entryAt)}</div>
                    <div className="text-sm text-gray-500">{formatDateTime(entryAt)}</div>
                    {gapDays !== null ? <span className="rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-600">+{gapDays} days</span> : null}
                  </div>
                  <div className="mt-3 text-xl font-semibold text-gray-900">{item.followupStatus ?? 'Follow-up logged'}</div>
                  {item.followupSubStatus ? <div className="mt-1 text-sm font-medium text-[#1B2A6B]">{item.followupSubStatus}</div> : null}
                  <div className="mt-3 text-base text-gray-700">{cleanRemark(item.comments) || 'No remark recorded for this follow-up.'}</div>
                  <div className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{item.followupClassification ?? '—'}</span>
                    {item.followupDate ? <span>{` · Next follow-up set for ${formatLongDate(item.followupDate)}`}</span> : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
        <div className="text-sm text-gray-500">{lastContact ? `Last activity ${formatDateTime(lastContact)}` : 'No follow-up activity recorded yet'}</div>
        <div className="flex gap-3">
          <Btn variant="outline" onClick={onClose}>Close</Btn>
          <Btn onClick={onLogFollowup}>Log follow-up</Btn>
        </div>
      </div>
    </>
  )
}
