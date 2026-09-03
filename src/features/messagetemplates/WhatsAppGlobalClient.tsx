'use client'

import { useState, useTransition } from 'react'
import { Btn, Input } from '@/components/ui'
import { deleteWhatsAppDraft, saveWhatsAppDraft, sendGlobalWhatsApp } from './whatsappActions'

type Draft = { whatsAppMessageDraftId: number; title: string; message: string }
export function WhatsAppGlobalClient({ initialDrafts }: { initialDrafts: Draft[] }) {
  const [customerName, setCustomerName] = useState('')
  const [mobile, setMobile] = useState('')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [drafts, setDrafts] = useState(initialDrafts)
  const [draftTitle, setDraftTitle] = useState('')
  const send = () => startTransition(async () => {
    const response = await sendGlobalWhatsApp({ customerName, mobile, message })
    setResult(response.success ? { ok: true, text: 'WhatsApp submitted to Meta. Delivery is not yet confirmed.' } : { ok: false, text: `WhatsApp failed: ${response.error || 'unknown error.'}` })
  })
  return <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
    <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-gray-900">WhatsApp Templates</h2><p className="mt-1 text-sm text-gray-500">Global template: <b>global_temp</b> · English · {'{{1}}'} Customer name · {'{{2}}'} Custom message</p></div><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">Active</span></div>
    <div className="mt-5 grid gap-3 md:grid-cols-2"><Input label="Customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} /><Input label="WhatsApp mobile" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="9876543210" /></div>
    <div className="mt-4 rounded-lg border border-gray-200 p-3"><div className="mb-2 text-sm font-medium text-gray-800">Reusable drafts</div><div className="flex gap-2"><Input label="Draft title" value={draftTitle} onChange={e => setDraftTitle(e.target.value)} placeholder="Appointment reminder" /><Btn onClick={() => startTransition(async () => { const response = await saveWhatsAppDraft({ title: draftTitle, message }); if (response.success && response.row) { setDrafts(current => [response.row, ...current]); setDraftTitle('') } else setResult({ ok: false, text: response.error || 'Could not save draft.' }) })} disabled={pending}>Save draft</Btn></div>{drafts.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{drafts.map(draft => <span key={draft.whatsAppMessageDraftId} className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-[#1B2A6B]"><button onClick={() => { setMessage(draft.message); setDraftTitle(draft.title) }}>{draft.title}</button><button className="text-red-600" onClick={() => startTransition(async () => { await deleteWhatsAppDraft(draft.whatsAppMessageDraftId); setDrafts(current => current.filter(item => item.whatsAppMessageDraftId !== draft.whatsAppMessageDraftId)) })}>×</button></span>)}</div>}</div>
    <label className="mt-3 block text-xs font-medium text-gray-600">Custom message ({'{{2}}'})</label><textarea value={message} onChange={e => setMessage(e.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Enter the customer update…" />
    <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">Preview: Hello {customerName || 'Customer'},<br /><br />{message || 'Your custom message will appear here.'}<br /><br />If you need any assistance, please contact us and our team will be happy to help.<br /><br />Regards,<br />ExcelCars</div>
    {result && <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${result.ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{result.text}</div>}
    <div className="mt-4 flex justify-end"><Btn onClick={send} disabled={pending}>{pending ? 'Sending...' : 'Send WhatsApp'}</Btn></div>
  </section>
}
