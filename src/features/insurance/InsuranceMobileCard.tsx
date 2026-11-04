'use client'

import { Eye, IndianRupee, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { InsuranceRow } from './InsuranceClient'
import { InsurancePaymentSummary } from './InsurancePaymentSummary'

const date = (value: Date | string | null) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)) : '—'

export function InsuranceMobileCard({ row, onView, onPay, onEdit, onDelete }: {
  row: InsuranceRow
  onView: (row: InsuranceRow) => void
  onPay: (row: InsuranceRow) => void
  onEdit: (row: InsuranceRow) => void
  onDelete: (id: number) => void
}) {
  return <article aria-labelledby={`insurance-${row.insuranceMainId}`} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm [overflow-wrap:anywhere]">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={`insurance-${row.insuranceMainId}`} className="font-mono text-base font-bold text-[#1B2A6B]">{row.carRegistrationNo || 'Registration not added'}</h2>
      <span className="text-xs text-gray-500">Insurance/{row.insuranceMainId}</span>
    </div>
    <p className="mt-1 text-sm font-semibold text-gray-900">{[row.carMakeLegacy, row.carModelLegacy, row.carVariantLegacy].filter(Boolean).join(' ') || 'Vehicle details unavailable'}</p>
    <p className="mt-1 text-xs text-gray-500">{[row.carType, row.carYear].filter(Boolean).join(' · ') || '—'}</p>
    <div className="my-3 flex flex-wrap gap-2">{row.payoutPaymentStatus && <Badge label={row.payoutPaymentStatus} />}{row.policyStatus && <Badge label={row.policyStatus} />}</div>
    <dl className="mb-4 grid min-w-0 gap-3 text-sm sm:grid-cols-2">
      <div className="min-w-0"><dt className="text-xs text-gray-500">Customer</dt><dd className="font-semibold text-gray-900">{row.customer?.custName ?? row.customerNameLegacy ?? '—'}</dd><dd className="text-gray-600">{row.customer?.custMobile ?? row.customerMobileLegacy ?? '—'}</dd></div>
      <div className="min-w-0"><dt className="text-xs text-gray-500">Agent</dt><dd className="font-semibold text-gray-900">{row.partnerMaster?.name ?? row.agentNameLegacy ?? '—'}</dd><dd className="text-gray-600">{row.partnerMaster?.mobile ?? row.agentMobileNoLegacy ?? '—'}</dd></div>
    </dl>
    <InsurancePaymentSummary payoutAmount={row.payoutAmount} totalAmountReceived={row.totalAmountReceived} />
    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div className="min-w-0"><dt className="text-xs text-gray-500">Next follow-up</dt><dd className="font-semibold text-gray-800">{date(row.followupDate)}</dd></div>
      <div className="min-w-0"><dt className="text-xs text-gray-500">Expiry</dt><dd className="text-gray-800">{date(row.expiryDate)}</dd></div>
    </dl>
    <details className="mt-3 border-t border-gray-100">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-[#1B2A6B]">Contact, renewal and remarks</summary>
      <dl className="space-y-3 pb-3 text-sm text-gray-700">
        <div><dt className="text-xs text-gray-500">Customer email</dt><dd>{row.customer?.custEmail ?? row.customerEmailLegacy ?? '—'}</dd></div>
        <div><dt className="text-xs text-gray-500">Agent email</dt><dd>{row.partnerMaster?.email ?? row.agentEmailIdLegacy ?? '—'}</dd></div>
        <div><dt className="text-xs text-gray-500">Renewal</dt><dd>{date(row.renewalDate)}</dd></div>
        <div><dt className="text-xs text-gray-500">Remarks</dt><dd className="whitespace-pre-wrap">{row.remark || 'No remarks added.'}</dd></div>
      </dl>
    </details>
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: 'View insurance', Icon: Eye, action: () => onView(row) },
        { label: 'Log payment', Icon: IndianRupee, action: () => onPay(row) },
        { label: 'Edit insurance', Icon: Pencil, action: () => onEdit(row) },
        { label: 'Delete insurance', Icon: Trash2, action: () => onDelete(row.insuranceMainId), danger: true },
      ].map(({ label, Icon, action, danger }) => <button key={label} type="button" onClick={action} className={`flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B2A6B] ${danger ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-gray-200 text-[#1B2A6B] hover:bg-blue-50'}`}><Icon aria-hidden="true" className="h-4 w-4 shrink-0" /><span>{label}</span></button>)}
    </div>
  </article>
}
