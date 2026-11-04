'use client'

import { useEffect, useRef, useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { Btn, Input, Modal } from '@/components/ui'
import { createCustomerFromLoan } from './actions'
import type { LoanCustomerMatch, LoanCustomerVehicleContext } from './customerLookup'

export interface LoanCustomerOption {
  custId: number
  custName: string
  custMobile: string | null
  custEmail: string | null
}

function vehicleLabel(vehicle: LoanCustomerVehicleContext | null) {
  if (!vehicle) return ''
  const description = [vehicle.make, vehicle.model, vehicle.variant, vehicle.year].filter(Boolean).join(' ')
  return vehicle.registrationNo ? `${vehicle.registrationNo}${description ? ` · ${description}` : ''}` : description
}

export function LoanCustomerLookup({
  value, onChange, error, errorMessage,
}: {
  value: LoanCustomerOption | null
  onChange: (customer: LoanCustomerOption | null, vehicle?: LoanCustomerVehicleContext | null) => void
  error?: boolean
  errorMessage?: string
}) {
  const [mobile, setMobile] = useState('')
  const [matches, setMatches] = useState<LoanCustomerMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMobile, setNewMobile] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [createVehicle, setCreateVehicle] = useState<LoanCustomerVehicleContext | null>(null)
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    const digits = mobile.replace(/\D/g, '')
    if (digits.length < 3) {
      setMatches([])
      setLookupError('')
      setLoading(false)
      return
    }
    const timeout = window.setTimeout(async () => {
      const currentRequest = ++requestId.current
      setLoading(true)
      setLookupError('')
      try {
        const response = await fetch(`/api/loan/customer-search?mobile=${encodeURIComponent(digits)}`)
        const payload = await response.json()
        if (requestId.current !== currentRequest) return
        if (!response.ok) {
          setMatches([])
          setLookupError(payload.error ?? 'Could not look up customers.')
          return
        }
        setMatches(payload)
      } catch {
        if (requestId.current === currentRequest) {
          setMatches([])
          setLookupError('Could not look up customers.')
        }
      } finally {
        if (requestId.current === currentRequest) setLoading(false)
      }
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [mobile])

  const chooseMatch = (match: LoanCustomerMatch) => {
    if (match.customerId) {
      onChange({ custId: match.customerId, custName: match.name, custMobile: match.mobile, custEmail: match.email }, match.vehicle)
      setMobile('')
      setMatches([])
      return
    }
    setNewName(match.name === 'Unnamed inquiry customer' ? '' : match.name)
    setNewMobile(match.mobile ?? mobile.replace(/\D/g, ''))
    setNewEmail(match.email ?? '')
    setCreateVehicle(match.vehicle)
    setCreateError('')
    setCreateOpen(true)
  }

  const openCreate = () => {
    setNewName('')
    setNewMobile(mobile.replace(/\D/g, ''))
    setNewEmail('')
    setCreateVehicle(null)
    setCreateError('')
    setCreateOpen(true)
  }

  const createCustomer = async () => {
    setCreating(true)
    setCreateError('')
    const result = await createCustomerFromLoan({ custName: newName, custMobile: newMobile, custEmail: newEmail })
    setCreating(false)
    if (!result.success || !result.customer) {
      setCreateError(result.error ?? 'Could not create customer.')
      return
    }
    onChange(result.customer, createVehicle)
    setCreateOpen(false)
    setMobile('')
    setMatches([])
  }

  if (value) {
    return (
      <div className="space-y-1">
        <div className={`flex items-center justify-between rounded-md border px-3 py-2 ${error ? 'border-red-500' : 'border-gray-200'} bg-gray-50`}>
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <div className="text-sm font-medium text-gray-800">{value.custName}</div>
            <div className="text-xs text-gray-500">{value.custMobile ?? 'No mobile'}{value.custEmail ? `· ${value.custEmail}` : ''}</div>
          </div>
          <button type="button" onClick={() => onChange(null)} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center text-gray-400 hover:text-red-600" aria-label="Clear selected customer"><X className="h-4 w-4" /></button>
        </div>
        {error && errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-2 [overflow-wrap:anywhere]">
      <div className="flex flex-col gap-2 sm:flex-row [&_button]:min-h-11 [&_button]:justify-center">
        <div className="min-w-0 flex-1"><Input placeholder="Enter mobile number first" inputMode="numeric" value={mobile} onChange={event => setMobile(event.target.value.replace(/\D/g, '').slice(0, 10))} error={error} errorMessage={errorMessage} /></div>
        <Btn type="button" variant="outline" onClick={openCreate}><UserPlus className="mr-1 h-4 w-4" />Create Customer</Btn>
      </div>
      <p className="text-xs text-gray-500">Search Customer Master and Inquiry Management by mobile. Shared mobile numbers stay as separate people—choose the correct one.</p>
      {mobile.length > 0 && mobile.length < 3 && <p className="text-xs text-gray-500">Enter at least 3 digits to search.</p>}
      {loading && <p className="text-sm text-gray-500">Looking up customers and inquiries…</p>}
      {lookupError && <p className="text-sm text-red-600">{lookupError}</p>}
      {!loading && mobile.length >= 3 && !lookupError && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          {matches.length === 0 ? <div className="px-3 py-3 text-sm text-gray-500">No matching customer or inquiry. Use Create Customer to add the person deliberately.</div> : matches.map(match => (
            <button key={match.id} type="button" onClick={() => chooseMatch(match)} className="block w-full border-b border-gray-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-blue-50">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-gray-800">{match.name}</span><span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{match.source === 'customer' ? 'Customer Master' : `Inquiry ${match.inquiryNo ?? `#${match.inquiryId}`}`}</span></div>
              <div className="mt-0.5 text-xs text-gray-500">{match.mobile ?? 'No mobile'}{match.email ? ` · ${match.email}` : ''}</div>
              {vehicleLabel(match.vehicle) && <div className="mt-1 text-xs text-[#1B2A6B]">Car: {vehicleLabel(match.vehicle)}</div>}
              {match.source === 'inquiry' && !match.customerId && <div className="mt-1 text-xs font-medium text-[#1B2A6B]">Select to explicitly create this inquiry person as a customer.</div>}
            </button>
          ))}
        </div>
      )}

      <Modal title="Create Customer from Loan" open={createOpen} onClose={() => !creating && setCreateOpen(false)} width="max-w-lg">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">This creates a Customer Master record only after you confirm. Existing mobile matches are shown above to help avoid duplicates.</p>
          <Input label="Customer name *" value={newName} maxLength={150} onChange={event => setNewName(event.target.value)} />
          <Input label="Mobile" inputMode="numeric" maxLength={10} value={newMobile} onChange={event => setNewMobile(event.target.value.replace(/\D/g, ''))} />
          <Input label="Email" type="email" maxLength={254} value={newEmail} onChange={event => setNewEmail(event.target.value)} />
          {createVehicle && <p className="rounded bg-blue-50 px-3 py-2 text-xs text-[#1B2A6B]">The selected inquiry car will be copied into this loan: {vehicleLabel(createVehicle)}</p>}
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>button]:min-h-11 [&>button]:justify-center"><Btn type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Btn><Btn type="button" onClick={createCustomer} disabled={creating || !newName.trim() || (!newMobile.trim() && !newEmail.trim())}>{creating ? 'Creating…' : 'Create and Select'}</Btn></div>
        </div>
      </Modal>
    </div>
  )
}
