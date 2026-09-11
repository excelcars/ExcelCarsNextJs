'use client'

import { Eye, IndianRupee, Pencil, Trash2 } from 'lucide-react'
import { Badge, Table } from '@/components/ui'
import type { InsuranceRow } from './InsuranceClient'

const fmtDate = (value: Date | string | null) => value ? new Date(value).toISOString().slice(0, 10) : ''
const fmtMoney = (value: string | number | null) => value ? `₹${Number(value).toLocaleString('en-IN')}` : '—'

export function InsuranceTable({ rows, onPay, onView, onEdit, onDelete }: {
  rows: InsuranceRow[]
  onPay: (row: InsuranceRow) => void
  onView: (row: InsuranceRow) => void
  onEdit: (row: InsuranceRow) => void
  onDelete: (id: number) => void
}) {
  return (
    <Table headers={['Reg No', 'Customer', 'Agent', 'Premium / OD', 'Payout', 'Received', 'Payout Status', 'Policy Status', 'Renewal / Expiry', 'Actions']} empty={rows.length === 0}>
      {rows.map(row => (
        <tr key={row.insuranceMainId} className="hover:bg-gray-50 transition">
          <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800 whitespace-nowrap">{row.carRegistrationNo ?? '—'}</td>
          <td className="px-4 py-3"><div className="font-medium text-gray-900">{row.customer?.custName ?? row.customerNameLegacy ?? '—'}</div><div className="text-xs text-gray-500 font-mono">{row.customerMobileLegacy ?? ''}</div></td>
          <td className="px-4 py-3"><div className="text-sm text-gray-700">{row.partnerMaster?.name ?? row.agentNameLegacy ?? '—'}</div><div className="text-xs text-gray-500">{row.partnerMaster?.mobile ?? row.agentMobileNoLegacy ?? ''}</div></td>
          <td className="px-4 py-3 text-sm text-gray-600">{fmtMoney(row.insurancePremium)} / {fmtMoney(row.oDPremium)}</td>
          <td className="px-4 py-3 text-sm font-semibold text-gray-800">{fmtMoney(row.payoutAmount)}</td>
          <td className="px-4 py-3 text-sm text-gray-600">{fmtMoney(row.totalAmountReceived)}</td>
          <td className="px-4 py-3">{row.payoutPaymentStatus ? <Badge label={row.payoutPaymentStatus} /> : '—'}</td>
          <td className="px-4 py-3">{row.policyStatus ? <Badge label={row.policyStatus} /> : '—'}</td>
          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(row.renewalDate) || '—'} / {fmtDate(row.expiryDate) || '—'}</td>
          <td className="px-4 py-3"><div className="flex items-center gap-1">
            <button onClick={() => onPay(row)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition" title="Log Payment"><IndianRupee className="w-3.5 h-3.5" /></button>
            <button onClick={() => onView(row)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="View"><Eye className="w-3.5 h-3.5" /></button>
            <button onClick={() => onEdit(row)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={() => onDelete(row.insuranceMainId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
          </div></td>
        </tr>
      ))}
    </Table>
  )
}
