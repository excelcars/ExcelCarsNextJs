'use client'

import { Eye, IndianRupee, Pencil, Trash2 } from 'lucide-react'
import { Badge, Table } from '@/components/ui'
import type { InsuranceRow } from './InsuranceClient'
import { getInsurancePaymentState } from './InsurancePaymentSummary'

const fmtDate = (value: Date | string | null) => value ? new Date(value).toISOString().slice(0, 10) : ''
const fmtMoney = (value: string | number | null) => value === null ? '—' : `₹${Number(value).toLocaleString('en-IN')}`

export function InsuranceTable({ rows, onPay, onView, onEdit, onDelete }: {
  rows: InsuranceRow[]
  onPay: (row: InsuranceRow) => void
  onView: (row: InsuranceRow) => void
  onEdit: (row: InsuranceRow) => void
  onDelete: (id: number) => void
}) {
  return (
    <Table headers={['Policy', 'Customer / Agent', 'Payment', 'Status', 'Renewal / Expiry', 'Actions']} empty={rows.length === 0} minWidthClass="min-w-[1050px]">
      {rows.map(row => (
        <tr key={row.insuranceMainId} className="hover:bg-gray-50 transition">
          <td className="px-4 py-3"><div className="font-mono text-sm font-semibold text-gray-800 whitespace-nowrap">{row.carRegistrationNo ?? '—'}</div><div className="mt-1 text-xs text-gray-500">{[row.carMakeLegacy, row.carModelLegacy, row.carVariantLegacy].filter(Boolean).join(' ') || row.carType || '—'}</div></td>
          <td className="px-4 py-3"><div className="font-medium text-gray-900">{row.customer?.custName ?? row.customerNameLegacy ?? '—'}</div><div className="text-xs text-gray-500">{row.customer?.custMobile ?? row.customerMobileLegacy ?? ''}</div><div className="mt-2 border-t border-gray-100 pt-2 text-sm text-gray-700">{row.partnerMaster?.name ?? row.agentNameLegacy ?? '—'}</div><div className="text-xs text-gray-500">Agent · {row.partnerMaster?.mobile ?? row.agentMobileNoLegacy ?? ''}</div></td>
          <td className="px-4 py-3"><PaymentCell payoutAmount={row.payoutAmount} totalAmountReceived={row.totalAmountReceived} insurancePremium={row.insurancePremium} oDPremium={row.oDPremium} /></td>
          <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">{row.payoutPaymentStatus ? <Badge label={row.payoutPaymentStatus} /> : null}{row.policyStatus ? <Badge label={row.policyStatus} /> : null}</div></td>
          <td className="px-4 py-3 text-sm text-gray-600"><div>Renewal: {fmtDate(row.renewalDate) || '—'}</div><div className="mt-1">Expiry: {fmtDate(row.expiryDate) || '—'}</div></td>
          <td className="px-4 py-3"><div className="flex items-center gap-1">
            <button onClick={() => onView(row)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="View"><Eye className="w-3.5 h-3.5" /></button>
            <button onClick={() => onPay(row)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition" title="Log Payment"><IndianRupee className="w-3.5 h-3.5" /></button>
            <button onClick={() => onEdit(row)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={() => onDelete(row.insuranceMainId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
          </div></td>
        </tr>
      ))}
    </Table>
  )
}

function PaymentCell({ payoutAmount, totalAmountReceived, insurancePremium, oDPremium }: Pick<InsuranceRow, 'payoutAmount' | 'totalAmountReceived' | 'insurancePremium' | 'oDPremium'>) {
  const payment = getInsurancePaymentState(payoutAmount, totalAmountReceived)
  return <div className="min-w-[145px]"><div className="flex items-center justify-between gap-2"><span className="font-semibold text-gray-900">{fmtMoney(totalAmountReceived)} / {fmtMoney(payoutAmount)}</span><span className={`rounded-full px-1.5 py-0.5 text-[12px] font-semibold ${payment.label === 'Paid' ? 'bg-emerald-50 text-emerald-700' : payment.label === 'Partial' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{payment.label}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200"><div className={payment.label === 'Paid' ? 'h-full bg-emerald-500' : payment.label === 'Partial' ? 'h-full bg-blue-500' : 'h-full bg-amber-400'} style={{ width: `${payment.percentage}%` }} /></div><div className="mt-1 text-xs text-gray-500">Balance {fmtMoney(payment.balance)} · Premium {fmtMoney(insurancePremium)} / {fmtMoney(oDPremium)}</div></div>
}
