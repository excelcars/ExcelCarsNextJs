'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { Btn } from '@/components/ui'
import type { InquirySourceMasterRow } from './types'

export function InquirySourceMobileCard({ row, onEdit, onDelete, pending = false }: {
  row: InquirySourceMasterRow
  onEdit: (row: InquirySourceMasterRow) => void
  onDelete: (row: InquirySourceMasterRow) => void
  pending?: boolean
}) {
  const inUse = row.inquiryCount > 0
  return (
    <article className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 font-semibold text-gray-900">{row.displayName}</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{row.isActive ? 'Active' : 'Inactive'}</span>
      </div>
      <p className="mt-1 font-mono text-sm text-gray-500">{row.code}</p>
      <dl className="mt-3 grid grid-cols-1 gap-3 rounded-lg bg-gray-50 p-3 text-sm min-[360px]:grid-cols-2">
        <div className="min-w-0"><dt className="text-xs text-gray-500">Category</dt><dd className="mt-1 text-gray-800">{row.category}</dd></div>
        <div className="min-w-0"><dt className="text-xs text-gray-500">Detail</dt><dd className="mt-1 text-gray-800">{row.requiresDetail ? 'Required' : 'Not required'}</dd></div>
        <div className="min-w-0"><dt className="text-xs text-gray-500">Reporting order</dt><dd className="mt-1 text-gray-800">{row.reportingSort}</dd></div>
        <div className="min-w-0"><dt className="text-xs text-gray-500">Linked inquiries</dt><dd className="mt-1 text-gray-800">{row.inquiryCount.toLocaleString('en-IN')}</dd></div>
      </dl>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 [&>button]:min-h-11 [&>button]:justify-center">
        <Btn variant="outline" aria-label={`Edit ${row.displayName}`} disabled={pending} onClick={() => onEdit(row)}><Pencil aria-hidden="true" className="h-4 w-4" />Edit</Btn>
        <Btn variant="outline" aria-label={`Delete ${row.displayName}`} className="text-red-600" disabled={inUse || pending} onClick={() => onDelete(row)}><Trash2 aria-hidden="true" className="h-4 w-4" />Delete</Btn>
      </div>
      {inUse && <p className="mt-2 text-xs text-gray-500">Cannot delete a source used by inquiries.</p>}
    </article>
  )
}
