import { Eye, Pencil, Trash2 } from 'lucide-react'
import type { ChecklistListRow } from './ChecklistClient'

const clean = (value: string | null | undefined) => !value || ['null', 'na', 'n/a'].includes(value.trim().toLowerCase()) ? '' : value

export function ChecklistMobileCards({ data, pending, onView, onEdit, onDelete }: {
  data: ChecklistListRow[]; pending: boolean; onView: (row: ChecklistListRow) => void; onEdit: (row: ChecklistListRow) => void; onDelete: (id: number) => void
}) {
  return <div aria-label="Vehicle checklists" aria-busy={pending} className={`grid min-w-0 gap-3 lg:grid-cols-2 xl:hidden ${pending ? 'opacity-60' : ''}`}>
    {data.length === 0 ? <p className="col-span-full rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">No records found</p> : data.map(row => {
      const complete = row.applicableCount > 0 && row.applicableCount === row.receivedApplicableCount
      return <article key={row.documentId} aria-labelledby={`checklist-card-${row.documentId}`} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={`checklist-card-${row.documentId}`} className="min-w-0 break-words font-mono text-base font-bold text-[#1B2A6B]">{row.registrationNo || '—'}</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${complete ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{complete ? 'Complete' : 'Partial'}</span>
        </div>
        <p className="mt-2 break-words [overflow-wrap:anywhere] text-sm font-semibold text-gray-900">{[clean(row.make), clean(row.model), clean(row.variant)].filter(Boolean).join(' ') || '—'}</p>
        <dl className="mt-3 grid min-w-0 gap-3 text-sm">
          <div><dt className="text-xs text-gray-500">Customer</dt><dd className="mt-0.5 break-words font-medium text-gray-800">{row.customer?.custName ?? row.customerNameLegacy ?? '—'}</dd></div>
          <div><dt className="text-xs text-gray-500">Mobile</dt><dd className="mt-0.5 break-words text-gray-700">{row.customer?.custMobile ?? row.customerMobileLegacy ?? '—'}</dd></div>
          <div><dt className="text-xs text-gray-500">Documents</dt><dd className="mt-0.5 text-gray-700">{row.receivedCount} / {row.documentCount} received</dd></div>
        </dl>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2">
          <button type="button" onClick={() => onView(row)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-[#1B2A6B] px-2 py-2 text-sm font-medium text-white hover:bg-[#12204f]"><Eye className="h-4 w-4 shrink-0" />View</button>
          <button type="button" onClick={() => onEdit(row)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><Pencil className="h-4 w-4 shrink-0" />Edit</button>
          <button type="button" aria-label={`Delete checklist ${row.registrationNo || row.documentId}`} title="Delete checklist" onClick={() => onDelete(row.documentId)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
        </div>
      </article>
    })}
  </div>
}
