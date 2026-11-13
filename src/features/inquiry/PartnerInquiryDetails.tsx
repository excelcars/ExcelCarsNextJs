'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronRight, FileText, X } from 'lucide-react'
import { getInquiryPartnerDetails } from './partnerDetails.actions'

export function PartnerInquiryDetails({ inquiryId, route = '/inquiry' }: { inquiryId: number; route?: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [details, setDetails] = useState<Awaited<ReturnType<typeof getInquiryPartnerDetails>>>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current.close()
  }, [open])
  const load = async () => {
    setOpen(true)
    if (details) return
    setLoading(true)
    setError('')
    try {
      const result = await getInquiryPartnerDetails(inquiryId, route)
      if (!result) setError('No partner details available for this inquiry.')
      setDetails(result)
    } catch { setError('Could not load partner details. Close and try again.') }
    finally { setLoading(false) }
  }
  return <div className="mt-2 text-sm">
    <button type="button" onClick={load} aria-haspopup="dialog" className="group inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-[#1B2A6B] shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:bg-blue-200">
      <FileText aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>Partner details</span>
      <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-blue-500 transition-transform group-hover:translate-x-0.5" />
    </button>
    <dialog ref={dialog} aria-labelledby={titleId} onClose={() => setOpen(false)} onCancel={event => { event.preventDefault(); setOpen(false) }} onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation() }} onClick={event => { if (event.target === event.currentTarget) setOpen(false) }} className="m-auto max-h-[85vh] w-[90vw] max-w-lg overflow-y-auto rounded-xl border-0 bg-white p-0 text-sm text-gray-900 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm">
      <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4">
        <h2 id={titleId} className="text-base font-semibold">Partner details</h2>
        <button type="button" autoFocus aria-label="Close partner details" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-lg text-gray-500 hover:bg-gray-100"><X aria-hidden="true" className="h-5 w-5" /></button>
      </div>
      <div className="px-5 py-4">
      {loading ? <p role="status">Loading partner details…</p> : error ? <p role="status">{error}</p> : details ? <>
        {details.submissions.length > 1 ? <p className="mb-4 text-gray-600">{details.submissions.length === 50 ? 'Latest 50' : details.submissions.length} partner submissions linked to this inquiry. Retry deliveries are grouped.</p> : null}
        {details.submissions.map(submission => <section key={submission.id} className="mb-5 last:mb-0">
          <p className="font-semibold text-[#1B2A6B]">{submission.partner === 'CARDEKHO' ? 'CarDekho' : 'Justdial'} inquiry</p>
          <p className="mb-2 mt-1 text-xs text-gray-500">Received {new Date(submission.receivedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
          <dl className="divide-y divide-gray-100">{submission.fields.map(field => <div key={field.label} className="grid gap-1 py-2 sm:grid-cols-[150px_1fr] sm:gap-3"><dt className="font-medium text-gray-700">{field.label}</dt><dd className="break-words whitespace-pre-wrap text-gray-600">{field.value}</dd></div>)}</dl>
        </section>)}
        {details.submissions.some(submission => submission.partner === 'CARDEKHO') ? <p className="mt-4 rounded-lg bg-blue-50 p-3 leading-6 text-blue-900">Make, model, and variant are matched automatically when the catalog has a clear match. If a description is missing or ambiguous, select the correct variant once and remember the mapping for future inquiries.</p> : null}
      </> : null}
      </div>
    </dialog>
  </div>
}
