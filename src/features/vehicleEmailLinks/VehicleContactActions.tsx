'use client'

import { Mail, MessageCircle, Phone, X } from 'lucide-react'
import { FormEvent, useState } from 'react'

interface VehicleContactActionsProps {
  token: string
  phoneHref: string
  whatsappHref: string
  canEnquire: boolean
}

function trackVehicleInteraction(token: string, interactionType: 'call_click' | 'whatsapp_click' | 'email_click', interactionLabel: string) {
  const payload = JSON.stringify({ token, interactionType, interactionLabel })

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], { type: 'application/json' })
    navigator.sendBeacon('/api/public/vehicle-email-link-interaction', blob)
    return
  }

  void fetch('/api/public/vehicle-email-link-interaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => undefined)
}

export function VehicleContactActions({
  token,
  phoneHref,
  whatsappHref,
  canEnquire,
}: VehicleContactActionsProps) {
  const [enquiryOpen, setEnquiryOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submitEnquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/public/vehicle-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, phone, email, message }),
      })
      const payload: unknown = await response.json()
      if (!response.ok || !payload || typeof payload !== 'object' || !('success' in payload) || payload.success !== true) {
        const message = payload && typeof payload === 'object' && 'error' in payload ? String(payload.error) : 'Could not submit your enquiry. Please try again.'
        setError(message)
        return
      }

      trackVehicleInteraction(token, 'email_click', 'Enquire Now')
      setSuccess('Thanks — your enquiry has been received. Our team will contact you shortly.')
      setName('')
      setPhone('')
      setEmail('')
      setMessage('')
    } catch {
      setError('Could not submit your enquiry. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const closeEnquiry = () => {
    if (submitting) return
    setEnquiryOpen(false)
    setError('')
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={phoneHref}
          onClick={() => trackVehicleInteraction(token, 'call_click', 'Call Now')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#142b62] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0d1e48]"
        >
          <Phone className="h-4 w-4" /> Call Now
        </a>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackVehicleInteraction(token, 'whatsapp_click', 'WhatsApp')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d7194a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#b5123d]"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
        {canEnquire ? <button
          type="button"
          onClick={() => { setSuccess(''); setError(''); setEnquiryOpen(true) }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#142b62] px-4 py-3 text-sm font-semibold text-[#142b62] transition hover:bg-[#f1f5fb] sm:col-span-2"
        >
          <Mail className="h-4 w-4" /> Enquire Now
        </button> : null}
      </div>

      {enquiryOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/50 p-3 sm:items-center sm:p-4" role="presentation" onMouseDown={closeEnquiry}>
          <section className="my-auto w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="vehicle-enquiry-title" onMouseDown={event => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="vehicle-enquiry-title" className="text-xl font-bold text-[#142b62]">Send an enquiry</h2>
                <p className="mt-1 text-sm text-slate-600">Share your details and our team will contact you.</p>
              </div>
              <button type="button" onClick={closeEnquiry} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Close enquiry form">
                <X className="h-5 w-5" />
              </button>
            </div>

            {success ? (
              <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{success}</div>
            ) : (
              <form className="space-y-4" onSubmit={submitEnquiry}>
                <label className="block text-sm font-medium text-slate-700">Name<input required value={name} onChange={event => setName(event.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-[#142b62] focus:ring-2 focus:ring-[#142b62]/20" /></label>
                <label className="block text-sm font-medium text-slate-700">Mobile number<input required value={phone} onChange={event => setPhone(event.target.value)} inputMode="tel" maxLength={20} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-[#142b62] focus:ring-2 focus:ring-[#142b62]/20" /></label>
                <label className="block text-sm font-medium text-slate-700">Email <span className="font-normal text-slate-500">(optional)</span><input value={email} onChange={event => setEmail(event.target.value)} type="email" maxLength={254} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-[#142b62] focus:ring-2 focus:ring-[#142b62]/20" /></label>
                <label className="block text-sm font-medium text-slate-700">Message <span className="font-normal text-slate-500">(optional)</span><textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={2000} rows={3} className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-[#142b62] focus:ring-2 focus:ring-[#142b62]/20" /></label>
                {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
                <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center rounded-xl bg-[#142b62] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0d1e48] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Sending…' : 'Submit enquiry'}</button>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  )
}
