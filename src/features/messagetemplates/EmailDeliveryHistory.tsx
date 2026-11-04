export interface DeliveryRow {
  deliveryLogId: number
  recipientEmail: string
  status: string
  errorMessage: string | null
  attachmentCount: number
  attemptedAt: Date | string
}

export function EmailDeliveryHistory({ rows, error }: { rows: DeliveryRow[]; error: string }) {
  if (error) return <p className="break-words text-sm text-red-600">{error}</p>
  if (rows.length === 0) return <p className="text-sm text-gray-400">No email attempts for this template yet.</p>
  return <div className="min-w-0 space-y-2">{rows.map(item => <article key={item.deliveryLogId} className="min-w-0 break-words [overflow-wrap:anywhere] rounded-lg border border-gray-200 px-3 py-2 text-sm">
    <div className="flex min-w-0 flex-wrap justify-between gap-2"><span className="min-w-0 font-medium">{item.recipientEmail}</span><span className={item.status === 'Sent' ? 'text-green-700' : 'text-red-700'}>{item.status}</span></div>
    <p className="mt-1 text-xs text-gray-500">{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(item.attemptedAt))} · {item.attachmentCount} attachment{item.attachmentCount === 1 ? '' : 's'}</p>
    {item.errorMessage && <p className="mt-1 text-xs text-red-600">{item.errorMessage}</p>}
  </article>)}</div>
}
