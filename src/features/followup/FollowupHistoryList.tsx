import type { LogFollowupHistoryItem } from './LogFollowupRecentActivity'

export function FollowupHistoryList({ history, formatDate, formatStatus, cleanRemark }: {
  history: LogFollowupHistoryItem[]
  formatDate: (value: Date | string | null | undefined) => string
  formatStatus: (status: string, subStatus: string) => string
  cleanRemark: (value: string | null | undefined) => string
}) {
  if (history.length === 0) return <p className="p-5 text-center text-sm text-gray-500">No follow-up history recorded yet.</p>
  return <>
    <div className="grid min-w-0 gap-3 p-3 md:hidden">{history.map((entry, index) => <article key={entry.pkFollowupId} className="min-w-0 break-words [overflow-wrap:anywhere] rounded-lg border border-gray-200 p-3">
      <h3 className="text-sm font-semibold text-[#1B2A6B]">#{index + 1} · {formatStatus(entry.followupStatus ?? '', entry.followupSubStatus ?? '')}</h3>
      <dl className="mt-3 grid gap-3 text-sm">
        <div><dt className="text-xs text-gray-500">Entry date</dt><dd className="mt-0.5 text-gray-800">{formatDate(entry.createdDt ?? entry.followupDate) || '—'}</dd></div>
        <div><dt className="text-xs text-gray-500">Follow-up date</dt><dd className="mt-0.5 text-gray-800">{formatDate(entry.followupDate) || '—'}</dd></div>
        <div><dt className="text-xs text-gray-500">Remarks</dt><dd className="mt-0.5 whitespace-pre-wrap text-gray-800">{cleanRemark(entry.comments) || '—'}</dd></div>
      </dl>
    </article>)}</div>
    <div className="hidden min-w-0 overflow-x-auto md:block"><table className="w-full min-w-[760px] text-sm">
      <thead className="bg-[#1B2A6B] text-left text-xs font-semibold uppercase tracking-wide text-white"><tr>{['Sr. No.', 'Entry Date', 'Follow-up Date', 'Status', 'Remarks'].map(label => <th key={label} className="px-5 py-3">{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-gray-100">{history.map((entry, index) => <tr key={entry.pkFollowupId} className="bg-white hover:bg-gray-50">
        <td className="px-5 py-3 text-gray-500">{index + 1}</td><td className="whitespace-nowrap px-5 py-3 text-gray-700">{formatDate(entry.createdDt ?? entry.followupDate) || '—'}</td><td className="whitespace-nowrap px-5 py-3 text-gray-700">{formatDate(entry.followupDate) || '—'}</td><td className="px-5 py-3 text-gray-700">{formatStatus(entry.followupStatus ?? '', entry.followupSubStatus ?? '')}</td><td className="max-w-xl whitespace-pre-wrap break-words [overflow-wrap:anywhere] px-5 py-3 text-gray-700">{cleanRemark(entry.comments) || '—'}</td>
      </tr>)}</tbody>
    </table></div>
  </>
}
