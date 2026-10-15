'use client'

import { Eye, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { ChecklistListRow } from './ChecklistClient'

const clean = (value: string | null | undefined) => (!value || ['null', 'na', 'n/a'].includes(value.trim().toLowerCase()) ? '' : value)

function statusFromCounts(applicableCount: number, receivedApplicableCount: number) {
  return applicableCount > 0 && applicableCount === receivedApplicableCount ? 'Complete' : 'Partial'
}

export function ChecklistTable({ data, pending, onView, onEdit, onDelete }: {
  data: ChecklistListRow[]
  pending: boolean
  onView: (row: ChecklistListRow) => void
  onEdit: (row: ChecklistListRow) => void
  onDelete: (id: number) => void
}) {
  return <div className={`overflow-hidden rounded-xl border border-gray-200 bg-white ${pending ? 'opacity-60' : ''}`}><table className="w-full table-fixed text-sm"><thead className="border-b border-gray-200 bg-slate-50"><tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500"><th className="w-[13%] px-3 py-3">Registration</th><th className="w-[28%] px-3 py-3">Vehicle</th><th className="w-[22%] px-3 py-3">Customer</th><th className="w-[15%] px-3 py-3">Documents</th><th className="w-[12%] px-3 py-3">Status</th><th className="w-[10%] px-3 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{data.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-400">No records found</td></tr> : data.map(row => <tr key={row.documentId} className="hover:bg-slate-50/70"><td className="px-3 py-3 align-top font-mono text-xs font-semibold text-[#1B2A6B]">{row.registrationNo ?? '—'}</td><td className="px-3 py-3 align-top font-medium text-gray-900">{[clean(row.make), clean(row.model), clean(row.variant)].filter(Boolean).join(' ') || '—'}</td><td className="px-3 py-3 align-top"><div className="font-medium text-gray-800">{row.customer?.custName ?? row.customerNameLegacy ?? '—'}</div><div className="text-xs text-gray-500">{row.customer?.custMobile ?? row.customerMobileLegacy ?? ''}</div></td><td className="px-3 py-3 align-top text-gray-700">{row.receivedCount} / {row.documentCount} received</td><td className="px-3 py-3 align-top"><Badge label={statusFromCounts(row.applicableCount, row.receivedApplicableCount)} /></td><td className="px-3 py-3 align-top"><div className="flex justify-end gap-1"><button onClick={() => onView(row)} className="inline-flex rounded-md p-2 text-gray-700 transition hover:bg-gray-50" title="View"><Eye className="h-4 w-4" /></button><button onClick={() => onEdit(row)} className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-[#1B2A6B]" title="Edit"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => onDelete(row.documentId)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>)}</tbody></table></div>
}
