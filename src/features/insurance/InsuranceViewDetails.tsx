'use client'

import { IndianRupee, Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, Btn } from '@/components/ui'
import type { InsuranceRow } from './InsuranceClient'

const dateValue = (value: Date | string | null) => value ? new Date(value).toISOString().slice(0, 10) : ''
const money = (value: string | number | null) => value === null ? '—' : `₹${Number(value).toLocaleString('en-IN')}`
const vehicleName = (row: InsuranceRow) => [row.carMakeLegacy, row.carModelLegacy, row.carVariantLegacy].filter(Boolean).join(' ') || 'Vehicle details unavailable'
const today = () => { const value = new Date(); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` }

export function InsuranceViewDetails({ row, onEdit, onLogPayment }: { row: InsuranceRow; onEdit: () => void; onLogPayment: () => void }) {
  const payout = Math.max(0, Number(row.payoutAmount ?? 0))
  const received = Math.max(0, Number(row.totalAmountReceived ?? 0))
  const pending = Math.max(0, payout - received)
  const followupDate = dateValue(row.followupDate)
  const showOverdue = Boolean(followupDate && followupDate < today() && row.policyStatus === 'Pending')
  const customerName = row.customer?.custName ?? row.customerNameLegacy ?? 'Customer not linked'

  return <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
    <section className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex flex-wrap gap-2"><span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">Insurance/{row.insuranceMainId}</span><span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#1B2A6B]">{row.carType ?? 'Policy'}</span></div>
          <h2 className="mt-3 text-2xl font-bold text-gray-900">{customerName}</h2>
          <div className="mt-1 text-sm text-gray-500">{row.carRegistrationNo ?? 'Registration not added'} · Raised {dateValue(row.entryDate) || '—'} · Expires {dateValue(row.expiryDate) || '—'}</div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex flex-wrap justify-end gap-2"><Badge label={row.payoutPaymentStatus ?? 'Pending'} /><Badge label={row.policyStatus ?? 'Pending'} /></div>
          <div className="flex gap-2"><Btn size="sm" variant="outline" onClick={onEdit}><Pencil className="h-3.5 w-3.5" />Edit</Btn><Btn size="sm" onClick={onLogPayment}><IndianRupee className="h-3.5 w-3.5" />Log payment</Btn></div>
        </div>
      </div>
    </section>

    {showOverdue && <div className="border-y border-red-100 bg-red-50 px-6 py-4 text-sm font-medium text-red-700">Follow-up was due on {followupDate}. Please reschedule or complete the policy follow-up.</div>}

    <section className="grid divide-y divide-gray-100 border-b border-gray-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
      <Metric label="Assigned agent" value={row.partnerMaster?.name ?? row.agentNameLegacy ?? '—'} detail={row.partnerMaster?.mobile ?? row.agentMobileNoLegacy ?? ''} />
      <Metric label="Payout amount" value={money(row.payoutAmount)} detail={`${row.payoutPercentageOdPremium ?? '—'}% of OD`} />
      <Metric label="Pending balance" value={money(pending)} detail={`${money(received)} received`} emphasis={pending > 0} />
      <Metric label="Next follow-up" value={followupDate || 'Not scheduled'} detail={row.policyStatus ?? 'Pending'} />
    </section>

    <section className="grid gap-5 p-6 lg:grid-cols-2">
      <DetailSection title="Contact">
        <Detail label="Mobile" value={row.customer?.custMobile ?? row.customerMobileLegacy ?? '—'} strong />
        <Detail label="Email" value={row.customer?.custEmail ?? row.customerEmailLegacy ?? '—'} />
      </DetailSection>
      <DetailSection title="Vehicle">
        <Detail label="Registration" value={row.carRegistrationNo ?? '—'} strong mono />
        <Detail label="Vehicle" value={vehicleName(row)} />
        <Detail label="Type / year" value={`${row.carType ?? '—'}${row.carYear ? ` / ${row.carYear}` : ''}`} />
      </DetailSection>
      <DetailSection title="Insurance details">
        <Detail label="Renewal date" value={dateValue(row.renewalDate) || '—'} />
        <Detail label="Expiry date" value={dateValue(row.expiryDate) || '—'} />
        <Detail label="Insurance premium / OD" value={`${money(row.insurancePremium)} / ${money(row.oDPremium)}`} strong />
      </DetailSection>
      <DetailSection title="Assigned agent">
        <Detail label="Name" value={row.partnerMaster?.name ?? row.agentNameLegacy ?? '—'} strong />
        <Detail label="Mobile" value={row.partnerMaster?.mobile ?? row.agentMobileNoLegacy ?? '—'} />
        <Detail label="Email" value={row.partnerMaster?.email ?? row.agentEmailIdLegacy ?? '—'} />
      </DetailSection>
    </section>

    <section className="mx-6 mb-6 rounded-xl border border-gray-200 p-5"><div className="flex items-center justify-between gap-3"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Remarks</div><div className="text-xs text-gray-500">Payout {money(row.payoutAmount)} · Received {money(row.totalAmountReceived)}</div></div><div className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{row.remark || 'No remarks added.'}</div></section>
  </div>
}

function Metric({ label, value, detail, emphasis = false }: { label: string; value: string; detail: string; emphasis?: boolean }) {
  return <div className="min-h-28 px-6 py-5"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</div><div className={`mt-2 text-xl font-bold ${emphasis ? 'text-orange-700' : 'text-gray-900'}`}>{value}</div>{detail && <div className="mt-1 text-xs text-gray-500">{detail}</div>}</div>
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border border-gray-200 p-5"><div className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{title}</div><div className="space-y-4">{children}</div></section>
}

function Detail({ label, value, strong = false, mono = false }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return <div><div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div><div className={`mt-1 break-words text-sm text-gray-800 ${strong ? 'font-semibold text-lg' : ''} ${mono ? 'font-mono' : ''}`}>{value}</div></div>
}
