'use client'

import { useEffect, useState } from 'react'
import { Btn } from '@/components/ui'

type Delivery = { inquiryId: number; templateName: string | null; status: string; errorMessage: string | null; createdAt: string; confirmedAt: string | null }
export function WhatsAppDeliveryPanel() {
  const [rows, setRows] = useState<Delivery[]>([])
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let pending = false
    async function load() {
      if (pending) return
      pending = true
      try {
        const response = await fetch('/api/messages/delivery', { signal: controller.signal, cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load delivery status.')
        if (!controller.signal.aborted) { setRows(data.deliveries); setError('') }
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load delivery status.') }
      finally { pending = false }
    }
    void load()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load() }, 15000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [refresh])
  return <section className="rounded-xl border border-gray-200 bg-white p-4">
    <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-[#1B2A6B]">Template delivery status</h2><p className="mt-1 text-xs text-gray-500">Latest 20 inquiry template attempts. Submitted means Meta accepted the request; delivery is confirmed separately.</p></div><Btn size="sm" variant="outline" onClick={() => setRefresh(value => value + 1)}>Refresh status</Btn></div>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <div className="mt-3 max-h-72 divide-y divide-gray-100 overflow-y-auto">
      {rows.map((row, index) => <div key={`${row.inquiryId}-${row.createdAt}-${index}`} className="py-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="text-gray-700">Inquiry #{row.inquiryId} · {row.templateName || 'Template'}</span><span className={`font-semibold capitalize ${row.status.toLowerCase() === 'failed' ? 'text-red-700' : 'text-[#1B2A6B]'}`}>{row.status}</span></div>
        <p className="mt-1 text-xs text-gray-500">{new Date(row.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST{!row.confirmedAt && row.status === 'Submitted' ? ' · Awaiting delivery callback' : ''}</p>
        {row.errorMessage && <p className="mt-2 break-words text-red-700">{row.errorMessage}</p>}
      </div>)}
      {!error && !rows.length && <p className="py-4 text-sm text-gray-500">No template attempts found.</p>}
    </div>
  </section>
}
