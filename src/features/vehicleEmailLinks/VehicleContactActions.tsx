'use client'

import { Mail, MessageCircle, Phone } from 'lucide-react'

interface VehicleContactActionsProps {
  token: string
  phoneHref: string
  whatsappHref: string
  mailHref: string
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
  mailHref,
}: VehicleContactActionsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <a
        href={phoneHref}
        onClick={() => trackVehicleInteraction(token, 'call_click', 'Call Now')}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c59b3b] px-4 py-3 text-sm font-semibold text-white"
      >
        <Phone className="h-4 w-4" /> Call Now
      </a>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackVehicleInteraction(token, 'whatsapp_click', 'WhatsApp')}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111111] px-4 py-3 text-sm font-semibold text-white"
      >
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </a>
      <a
        href={mailHref}
        onClick={() => trackVehicleInteraction(token, 'email_click', 'Enquire Now')}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d9cfbb] px-4 py-3 text-sm font-semibold text-gray-800 sm:col-span-2"
      >
        <Mail className="h-4 w-4" /> Enquire Now
      </a>
    </div>
  )
}
