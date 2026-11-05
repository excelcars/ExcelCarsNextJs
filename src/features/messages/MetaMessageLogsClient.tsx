'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Btn, PageHeader } from '@/components/ui'

type LogRow = {
  key: string; recipientMobile: string; recipientName: string | null; phoneNumberId: string
  body: string | null; messageType: string; templateName: string | null; sentAt: string
  status: string; statusAt: string | null; errorMessage: string | null
  providerMessageId: string | null; phoneMessageCount: number
}
type Result = {
  rows: LogRow[]
  summary: { total: number; phones: number; submitted: number; delivered: number; failed: number }
  page: number; pageSize: number
  historyNotice: string | null
}
const formatTime = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })
const fieldClass = 'min-h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#1B2A6B]'

export function MetaMessageLogsClient() {
  const [filters, setFilters] = useState({ search: '', from: '', to: '' })
  const [applied, setApplied] = useState(filters)
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let pending = false
    setResult(null)
    async function load() {
      if (pending) return
      pending = true
      setLoading(true)
      try {
        const params = new URLSearchParams({ ...applied, page: String(page) })
        const response = await fetch(`/api/messages/logs?${params}`, { signal: controller.signal, cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load message logs.')
        if (!controller.signal.aborted) { setResult(data); setError('') }
      } catch (cause) {
        if (!controller.signal.aborted) { setResult(null); setError(cause instanceof Error ? cause.message : 'Unable to load message logs.') }
      } finally {
        pending = false
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load() }, 15000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [applied, page, refresh])

  const summary = result?.summary
  const pages = Math.max(1, Math.ceil((summary?.total || 0) / 50))
  return <div>
    <PageHeader title="Meta Message Logs" subtitle="Outgoing WhatsApp templates and replies · All times in IST" action={<Btn variant="outline" disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Btn>} />
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
      {([
        ['Message attempts', summary?.total], ['Phone numbers', summary?.phones], ['Accepted by Meta', summary?.submitted],
        ['Delivered / Read', summary?.delivered], ['Failed', summary?.failed],
      ] as const).map(([label, value]) => <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className={`mt-2 text-2xl font-bold ${label === 'Failed' && value ? 'text-red-700' : 'text-[#1B2A6B]'}`}>{value == null ? '—' : value.toLocaleString('en-IN')}</p>
      </div>)}
    </div>
    <form className="mb-5 grid items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto_auto]" onSubmit={event => { event.preventDefault(); setPage(1); setApplied({ ...filters }) }}>
      <label className="text-sm font-medium text-gray-600">Search<input className={`${fieldClass} mt-1`} placeholder="Phone, customer, template or Meta message ID" maxLength={200} value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} /></label>
      <label className="text-sm font-medium text-gray-600">From date (IST)<input type="date" className={`${fieldClass} mt-1`} value={filters.from} max={filters.to || undefined} onChange={event => setFilters({ ...filters, from: event.target.value })} /></label>
      <label className="text-sm font-medium text-gray-600">To date (IST)<input type="date" className={`${fieldClass} mt-1`} value={filters.to} min={filters.from || undefined} onChange={event => setFilters({ ...filters, to: event.target.value })} /></label>
      <Btn type="submit">Apply filters</Btn>
      <Btn variant="outline" onClick={() => { const empty = { search: '', from: '', to: '' }; setFilters(empty); setApplied(empty); setPage(1) }}>Clear</Btn>
    </form>
    <p className="mb-3 text-xs leading-5 text-gray-500">Counts use the selected filters. Accepted means Meta accepted the send; delivery is confirmed separately. The message count beside each phone includes all its matching attempts. Logs refresh every 15 seconds.</p>
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {result?.historyNotice && <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{result.historyNotice}</p>}
    <section aria-label="Outgoing message logs" aria-busy={loading} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr>
            {['Customer name', 'Phone number', 'No. of messages', 'Message sent', 'Attempt time (IST)', 'Status'].map(label => <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {result?.rows.map(row => <tr key={row.key} className="align-top hover:bg-gray-50/60">
              <td className="px-4 py-4 font-semibold text-gray-800">{row.recipientName || 'Name unavailable'}</td>
              <td className="whitespace-nowrap px-4 py-4 font-medium text-[#1B2A6B]">{row.recipientMobile ? `+${row.recipientMobile}` : 'Unknown number'}</td>
              <td className="px-4 py-4 font-semibold tabular-nums">{row.phoneMessageCount}</td>
              <td className="min-w-80 max-w-lg px-4 py-4"><p className="whitespace-pre-wrap break-words text-gray-700">{row.body || 'The message text was not saved for this older send.'}</p></td>
              <td className="whitespace-nowrap px-4 py-4 text-gray-600">{formatTime(row.sentAt)}</td>
              <td className="max-w-xs px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${row.status === 'failed' ? 'bg-red-50 text-red-700' : ['delivered', 'read'].includes(row.status) ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-800'}`}>{row.status === 'submitted' ? 'Accepted by Meta' : row.status}</span>
                {row.statusAt && <p className="mt-2 text-xs text-gray-500">Updated {formatTime(row.statusAt)} IST</p>}
                {row.errorMessage && <p className="mt-2 break-words text-xs text-red-700">{row.errorMessage}</p>}
              </td>
            </tr>)}
            {!result?.rows.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">{loading ? 'Loading message logs…' : error ? 'Message logs could not be loaded.' : 'No outgoing messages found for these filters.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
        <span>{summary ? `${summary.total.toLocaleString('en-IN')} message attempts · Page ${page} of ${pages}` : 'Message logs'}</span>
        <div className="flex gap-2"><Btn size="sm" variant="outline" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Previous</Btn><Btn size="sm" variant="outline" disabled={loading || !result || page >= pages} onClick={() => setPage(value => value + 1)}>Next</Btn></div>
      </div>
    </section>
    <p className="mt-4 text-xs leading-5 text-gray-500">Shows sends saved by this CRM, including available older template logs. Messages sent outside this CRM are only available if recorded here.</p>
  </div>
}
