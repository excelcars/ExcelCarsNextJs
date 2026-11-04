'use client'

import { Eye, Mail, Pencil, Phone, Trash2 } from 'lucide-react'
import { Btn } from '@/components/ui'
import { formatCustomerDate, type CustomerRow } from './types'

export function CustomerMobileCard({ row, canWrite, onView, onEdit, onDelete }: {
  row: CustomerRow
  canWrite: boolean
  onView: (row: CustomerRow) => void
  onEdit: (row: CustomerRow) => void
  onDelete: (id: number) => void
}) {
  return (
    <article className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 font-semibold text-gray-900">{row.custName}</h2>
        {row.type && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#1B2A6B]">{row.type}</span>}
      </div>
      {row.companyName && <p className="mt-1 text-sm text-gray-500">{row.companyName}</p>}
      <div className="mt-3 space-y-2 text-sm">
        <p className="flex items-start gap-2 text-gray-700"><Phone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><span>{row.custMobile || '—'}</span></p>
        {row.mobile_2 && <p className="flex items-start gap-2 text-gray-500"><Phone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><span>{row.mobile_2} <span className="text-xs">(Mobile 2)</span></span></p>}
        <p className="flex items-start gap-2 text-gray-500"><Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" /><span className="min-w-0">{row.custEmail || '—'}</span></p>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-3 rounded-lg bg-gray-50 p-3 text-sm min-[360px]:grid-cols-2">
        <div className="min-w-0"><dt className="text-xs text-gray-500">Date of birth</dt><dd className="mt-1 text-gray-700">{formatCustomerDate(row.custDob) || '—'}</dd></div>
        <div className="min-w-0"><dt className="text-xs text-gray-500">Anniversary</dt><dd className="mt-1 text-gray-700">{formatCustomerDate(row.custAnniversaryDt) || '—'}</dd></div>
      </dl>
      <div className={`mt-3 grid gap-2 border-t border-gray-100 pt-3 ${canWrite ? 'grid-cols-2' : 'grid-cols-1'} [&>button]:min-h-11 [&>button]:justify-center`}>
        <Btn className={canWrite ? 'col-span-2' : ''} variant="outline" onClick={() => onView(row)}><Eye className="h-4 w-4" />View customer</Btn>
        {canWrite && <>
          <Btn variant="outline" onClick={() => onEdit(row)}><Pencil className="h-4 w-4" />Edit</Btn>
          <Btn className="text-red-600" variant="outline" onClick={() => onDelete(row.custId)}><Trash2 className="h-4 w-4" />Delete</Btn>
        </>}
      </div>
    </article>
  )
}
