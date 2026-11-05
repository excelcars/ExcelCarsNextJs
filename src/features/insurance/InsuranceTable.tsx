'use client'

import { CalendarDays, Eye, FileText, IndianRupee, Mail, Pencil, Phone, Trash2, UserRound } from 'lucide-react'
import { Badge, IconButton, Table } from '@/components/ui'
import type { InsuranceRow } from './InsuranceClient'
import { getInsurancePaymentState } from './InsurancePaymentSummary'
import { InsuranceMobileCard } from './InsuranceMobileCard'

const fmtShortDate = (value: Date | string | null) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—'
const fmtMoney = (value: string | number | null) => value === null ? '—' : `₹${Number(value).toLocaleString('en-IN')}`

export function InsuranceTable({ rows, onPay, onView, onEdit, onDelete }: {
  rows: InsuranceRow[]
  onPay: (row: InsuranceRow) => void
  onView: (row: InsuranceRow) => void
  onEdit: (row: InsuranceRow) => void
  onDelete: (id: number) => void
}) {
  return (
    <>
    <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:hidden">
      {rows.length === 0 ? <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 md:col-span-2">No records found</div> : rows.map(row => <InsuranceMobileCard key={row.insuranceMainId} row={row} onView={onView} onPay={onPay} onEdit={onEdit} onDelete={onDelete} />)}
    </div>
    <div className="hidden xl:block">
    <Table headers={['Vehicle', 'Customer & Agent', 'Payment', 'Status', 'Follow-up & Activity', 'Actions']} empty={rows.length === 0} minWidthClass="min-w-[1100px]" columnWidths={['17%', '21%', '21%', '13%', '16%', '12%']}>
      {rows.map(row => (
        <tr key={row.insuranceMainId} className="hover:bg-gray-50 transition">
          <td className="px-4 py-3"><div className="font-mono text-sm font-semibold text-[#1B2A6B]">{row.carRegistrationNo ?? '—'}</div><div className="mt-1 font-semibold text-gray-900">{[row.carMakeLegacy, row.carModelLegacy].filter(Boolean).join(' ') || row.carType || '—'}</div><div className="text-sm text-gray-500">{row.carVariantLegacy ?? '—'}</div><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{row.carYear ?? '—'}</span><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{row.carType ?? '—'}</span></div></td>
          <td className="px-4 py-3"><div className="font-semibold text-gray-900">{row.customer?.custName ?? row.customerNameLegacy ?? '—'}</div><div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-gray-500"><Phone aria-hidden="true" className="h-4 w-4 shrink-0" /><span>{row.customer?.custMobile ?? row.customerMobileLegacy ?? '—'}</span></div><div className="flex min-w-0 items-center gap-2 text-sm text-gray-500"><Mail aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="break-all">{row.customer?.custEmail ?? row.customerEmailLegacy ?? '—'}</span></div><div className="mt-2 border-t border-gray-100 pt-2 text-sm text-gray-600"><div className="flex min-w-0 items-center gap-2"><UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><span>{row.partnerMaster?.name ?? row.agentNameLegacy ?? '—'}</span></div>{(row.partnerMaster?.mobile ?? row.agentMobileNoLegacy) ? <div className="mt-1 flex items-center gap-2"><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />{row.partnerMaster?.mobile ?? row.agentMobileNoLegacy}</div> : null}</div></td>
          <td className="px-4 py-3"><PaymentCell payoutAmount={row.payoutAmount} totalAmountReceived={row.totalAmountReceived} insurancePremium={row.insurancePremium} oDPremium={row.oDPremium} /></td>
          <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">{row.payoutPaymentStatus ? <Badge label={row.payoutPaymentStatus} /> : null}{row.policyStatus ? <Badge label={row.policyStatus} /> : null}</div></td>
          <td className="px-4 py-3 text-sm text-gray-600"><div className="flex items-start gap-2"><CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><div><div className="font-semibold text-gray-800">{fmtShortDate(row.followupDate)}</div><div className="text-sm text-gray-500">Renewal {fmtShortDate(row.renewalDate)} · Expiry {fmtShortDate(row.expiryDate)}</div></div></div>{row.remark ? <div className="mt-2 flex items-start gap-2 text-sm text-gray-600"><FileText aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><span className="break-words">{row.remark}</span></div> : null}</td>
          <td className="px-2 py-3"><div className="flex items-center gap-1 whitespace-nowrap">
            <IconButton label="View insurance" onClick={() => onView(row)} className="p-1.5 hover:bg-slate-100 hover:text-slate-700"><Eye className="h-4 w-4" strokeWidth={1.8} /></IconButton>
            <IconButton label="Log payment" onClick={() => onPay(row)} className="p-1.5 hover:bg-slate-100 hover:text-slate-700"><IndianRupee className="h-4 w-4" strokeWidth={1.8} /></IconButton>
            <IconButton label="Edit insurance" onClick={() => onEdit(row)} className="p-1.5 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" strokeWidth={1.8} /></IconButton>
            <IconButton label="Delete insurance" onClick={() => onDelete(row.insuranceMainId)} className="p-1.5 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" strokeWidth={1.8} /></IconButton>
          </div></td>
        </tr>
      ))}
    </Table>
    </div>
    </>
  )
}

function PaymentCell({ payoutAmount, totalAmountReceived, insurancePremium, oDPremium }: Pick<InsuranceRow, 'payoutAmount' | 'totalAmountReceived' | 'insurancePremium' | 'oDPremium'>) {
  const payment = getInsurancePaymentState(payoutAmount, totalAmountReceived)
  return <div className="min-w-[145px]"><div className="flex items-center justify-between gap-2"><span className="font-semibold text-gray-900">{fmtMoney(totalAmountReceived)} / {fmtMoney(payoutAmount)}</span><Badge label={payment.label} /></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200"><div className={payment.label === 'Paid' ? 'h-full bg-emerald-500' : payment.label === 'Partial' ? 'h-full bg-blue-500' : 'h-full bg-amber-400'} style={{ width: `${payment.percentage}%` }} /></div><div className="mt-1 text-sm text-gray-500">Balance {fmtMoney(payment.balance)} · Premium {fmtMoney(insurancePremium)} / {fmtMoney(oDPremium)}</div></div>
}
