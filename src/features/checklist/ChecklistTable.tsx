'use client'

import { Eye, Pencil, Phone, Trash2 } from 'lucide-react'
import { Badge, IconButton } from '@/components/ui'
import type { ChecklistListRow } from './ChecklistClient'
import { ChecklistMobileCards } from './ChecklistMobileCards'

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
  return <><ChecklistMobileCards data={data} pending={pending} onView={onView} onEdit={onEdit} onDelete={onDelete} /><div className={`hidden xl:block overflow-x-auto rounded-xl border border-gray-200 bg-white ${pending ? 'opacity-60' : ''}`}><table className="w-full min-w-[960px] table-fixed border-separate border-spacing-0 text-sm"><thead className="bg-slate-50"><tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600"><th className="w-[13%] border-b border-r border-gray-200 px-3 py-2.5">Registration</th><th className="w-[28%] border-b border-r border-gray-200 px-3 py-2.5">Vehicle</th><th className="w-[22%] border-b border-r border-gray-200 px-3 py-2.5">Customer</th><th className="w-[15%] border-b border-r border-gray-200 px-3 py-2.5">Documents</th><th className="w-[12%] border-b border-r border-gray-200 px-3 py-2.5">Status</th><th className="w-[10%] border-b border-gray-200 px-3 py-2.5 text-right">Actions</th></tr></thead><tbody>{data.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-400">No records found</td></tr> : data.map(row => <tr key={row.documentId} className="hover:bg-slate-50/70 [&>td]:border-b [&>td]:border-r [&>td]:border-gray-100 [&>td]:[overflow-wrap:anywhere]"><td className="px-3 py-3 align-top font-mono text-sm font-semibold text-[#1B2A6B]">{row.registrationNo ?? '—'}</td><td className="px-3 py-3 align-top font-medium text-gray-900">{[clean(row.make), clean(row.model), clean(row.variant)].filter(Boolean).join(' ') || '—'}</td><td className="px-3 py-3 align-top"><div className="font-medium text-gray-800">{row.customer?.custName ?? row.customerNameLegacy ?? '—'}</div><div className="flex items-center gap-2 text-sm text-gray-500"><Phone aria-hidden="true" className="h-4 w-4 shrink-0" />{row.customer?.custMobile ?? row.customerMobileLegacy ?? '—'}</div></td><td className="px-3 py-3 align-top text-gray-700">{row.receivedCount} / {row.documentCount} received</td><td className="px-3 py-3 align-top"><Badge label={statusFromCounts(row.applicableCount, row.receivedApplicableCount)} /></td><td className="!border-r-0 px-3 py-3 align-top"><div className="flex justify-end gap-1"><IconButton label="View checklist" onClick={() => onView(row)}><Eye className="h-4 w-4" /></IconButton><IconButton label="Edit checklist" onClick={() => onEdit(row)}><Pencil className="h-4 w-4" /></IconButton><IconButton label="Delete checklist" onClick={() => onDelete(row.documentId)} className="hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></IconButton></div></td></tr>)}</tbody></table></div></>
}
