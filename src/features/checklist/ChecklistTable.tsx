'use client'

import { Eye, Pencil, Trash2 } from 'lucide-react'
import { Badge, Btn, Table } from '@/components/ui'
import type { ChecklistListRow } from './ChecklistClient'

const clean = (value: string | null | undefined) => (!value || ['null', 'na', 'n/a'].includes(value.trim().toLowerCase()) ? '' : value)

function statusFromCounts(applicableCount: number, receivedApplicableCount: number) {
  return applicableCount > 0 && applicableCount === receivedApplicableCount ? 'Complete' : 'Partial'
}

export function ChecklistTable({ data, total, page, pageCount, pageSize, pending, onView, onEdit, onDelete, onPage }: {
  data: ChecklistListRow[]
  total: number
  page: number
  pageCount: number
  pageSize: number
  pending: boolean
  onView: (row: ChecklistListRow) => void
  onEdit: (row: ChecklistListRow) => void
  onDelete: (id: number) => void
  onPage: (page: number) => void
}) {
  return <>
    <div className={pending ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <Table headers={['Reg No', 'Vehicle', 'Customer', 'Documents', 'Status', 'Actions']} empty={data.length === 0}>
        {data.map(row => (
          <tr key={row.documentId} className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800 whitespace-nowrap">{row.registrationNo ?? '—'}</td>
            <td className="px-4 py-3 text-sm text-gray-700">{[clean(row.make), clean(row.model), clean(row.variant)].filter(Boolean).join(' ') || '—'}</td>
            <td className="px-4 py-3"><div className="font-medium text-gray-900">{row.customer?.custName ?? row.customerNameLegacy ?? '—'}</div><div className="text-xs text-gray-500 font-mono">{row.customerMobileLegacy ?? ''}</div></td>
            <td className="px-4 py-3 text-sm text-gray-600">{row.receivedCount} / {row.documentCount} received</td>
            <td className="px-4 py-3"><Badge label={statusFromCounts(row.applicableCount, row.receivedApplicableCount)} /></td>
            <td className="px-4 py-3"><div className="flex items-center gap-1">
              <button onClick={() => onView(row)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="View"><Eye className="w-3.5 h-3.5" /></button>
              <button onClick={() => onEdit(row)} className="p-1.5 text-gray-400 hover:text-[#1B2A6B] hover:bg-blue-50 rounded transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => onDelete(row.documentId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div></td>
          </tr>
        ))}
      </Table>
    </div>
    {pageCount > 1 && <div className="mt-4 flex items-center justify-between gap-3">
      <div className="text-sm text-gray-500">Showing {data.length === 0 ? 0 : (page - 1) * pageSize + 1}-{(page - 1) * pageSize + data.length} of {total}</div>
      <div className="flex items-center gap-2"><Btn variant="outline" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1 || pending}>Previous</Btn><Btn variant="outline" size="sm" onClick={() => onPage(page + 1)} disabled={page >= pageCount || pending}>Next</Btn></div>
    </div>}
  </>
}
